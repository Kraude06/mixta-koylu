import { useEffect, useRef, useState, useCallback } from 'react';
import { socket } from '../socket';
import type { VoiceSDP, VoiceICE } from '@vampir-koylu/shared';

const ICE_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    // TURN relay — farklı ağlardaki cihazlar için zorunlu (NAT traversal)
    {
      urls: [
        'turn:openrelay.metered.ca:80',
        'turn:openrelay.metered.ca:443',
        'turn:openrelay.metered.ca:443?transport=tcp',
      ],
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
};

interface Peer {
  pc: RTCPeerConnection;
  audio: HTMLAudioElement;
}

export interface VoiceChatState {
  voiceActive: boolean;
  isMuted: boolean;
  micError: string | null;
  voicePeers: Set<string>;
  toggleMute: () => void;
  iceError: boolean;
}

function makeAudio(muted: boolean): HTMLAudioElement {
  const el = document.createElement('audio');
  el.autoplay = true;
  el.muted = muted;
  el.style.display = 'none';
  document.body.appendChild(el);
  return el;
}

function removeAudio(el: HTMLAudioElement) {
  el.pause();
  el.srcObject = null;
  el.remove();
}

export function useVoiceChat(enabled: boolean, permittedPeers: Set<string>): VoiceChatState {
  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef(new Map<string, Peer>());
  const permittedRef = useRef(permittedPeers);

  const [voiceActive, setVoiceActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [iceError, setIceError] = useState(false);
  const [voicePeers, setVoicePeers] = useState<Set<string>>(new Set());

  useEffect(() => { permittedRef.current = permittedPeers; }, [permittedPeers]);

  // Faz değişince izin verilen akışların sesini güncelle
  useEffect(() => {
    peersRef.current.forEach((peer, peerId) => {
      const shouldMute = !permittedPeers.has(peerId);
      peer.audio.muted = shouldMute;
      if (!shouldMute) peer.audio.play().catch(() => {});
    });
  }, [permittedPeers]);

  const closePeer = useCallback((peerId: string) => {
    const peer = peersRef.current.get(peerId);
    if (!peer) return;
    peer.pc.close();
    removeAudio(peer.audio);
    peersRef.current.delete(peerId);
    setVoicePeers(prev => {
      const next = new Set(prev);
      next.delete(peerId);
      return next;
    });
  }, []);

  const addPeer = useCallback((peerId: string): RTCPeerConnection => {
    closePeer(peerId);
    const pc = new RTCPeerConnection(ICE_CONFIG);
    const audio = makeAudio(!permittedRef.current.has(peerId));
    peersRef.current.set(peerId, { pc, audio });

    localStreamRef.current?.getTracks().forEach(t => {
      pc.addTrack(t, localStreamRef.current!);
    });

    pc.ontrack = (e) => {
      const peer = peersRef.current.get(peerId);
      if (!peer) return;
      peer.audio.srcObject = e.streams[0];
      peer.audio.muted = !permittedRef.current.has(peerId);
      peer.audio.play().catch(err => console.warn('[voice] play blocked:', err));
    };

    pc.onicecandidate = (e) => {
      if (!e.candidate) return;
      socket.emit('voice:ice', peerId, {
        candidate: e.candidate.candidate,
        sdpMid: e.candidate.sdpMid,
        sdpMLineIndex: e.candidate.sdpMLineIndex,
        usernameFragment: e.candidate.usernameFragment,
      });
    };

    pc.onconnectionstatechange = () => {
      console.log(`[voice] ${peerId} → ${pc.connectionState}`);
      if (pc.connectionState === 'failed') {
        console.warn('[voice] bağlantı başarısız, ICE restart deneniyor...');
        pc.restartIce();
      }
      if (pc.connectionState === 'closed') {
        closePeer(peerId);
      }
    };

    pc.oniceconnectionstatechange = () => {
      console.log(`[voice] ICE durumu: ${pc.iceConnectionState}`);
      if (pc.iceConnectionState === 'failed') {
        console.warn('[voice] ICE başarısız — TURN sunucusuna ulaşılamıyor olabilir');
        setIceError(true);
        pc.restartIce();
      }
      if (pc.iceConnectionState === 'connected' || pc.iceConnectionState === 'completed') {
        setIceError(false);
      }
    };

    pc.onicegatheringstatechange = () => {
      console.log(`[voice] ICE gathering: ${pc.iceGatheringState}`);
    };

    return pc;
  }, [closePeer]);

  // Socket event handlers
  useEffect(() => {
    const onPeerReady = async (peerId: string) => {
      console.log('[voice] peer ready:', peerId);
      if (!localStreamRef.current) return;
      setVoicePeers(prev => new Set([...prev, peerId]));
      const pc = addPeer(peerId);
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('voice:offer', peerId, { type: offer.type, sdp: offer.sdp });
      } catch (err) {
        console.error('[voice] offer error', err);
      }
    };

    const onPeerLeft = (peerId: string) => {
      console.log('[voice] peer left:', peerId);
      closePeer(peerId);
    };

    const onOffer = async (from: string, sdp: VoiceSDP) => {
      console.log('[voice] offer from:', from);
      if (!localStreamRef.current) return;
      setVoicePeers(prev => new Set([...prev, from]));
      const pc = addPeer(from);
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(sdp as RTCSessionDescriptionInit));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('voice:answer', from, { type: answer.type, sdp: answer.sdp });
      } catch (err) {
        console.error('[voice] answer error', err);
      }
    };

    const onAnswer = async (from: string, sdp: VoiceSDP) => {
      console.log('[voice] answer from:', from);
      const peer = peersRef.current.get(from);
      if (!peer) return;
      try {
        await peer.pc.setRemoteDescription(new RTCSessionDescription(sdp as RTCSessionDescriptionInit));
      } catch (err) {
        console.error('[voice] setRemoteDescription error', err);
      }
    };

    const onIce = async (from: string, candidate: VoiceICE) => {
      const peer = peersRef.current.get(from);
      if (!peer) return;
      try {
        await peer.pc.addIceCandidate(new RTCIceCandidate(candidate as RTCIceCandidateInit));
      } catch {}
    };

    socket.on('voice:peer-ready', onPeerReady);
    socket.on('voice:peer-left', onPeerLeft);
    socket.on('voice:offer', onOffer);
    socket.on('voice:answer', onAnswer);
    socket.on('voice:ice', onIce);

    return () => {
      socket.off('voice:peer-ready', onPeerReady);
      socket.off('voice:peer-left', onPeerLeft);
      socket.off('voice:offer', onOffer);
      socket.off('voice:answer', onAnswer);
      socket.off('voice:ice', onIce);
    };
  }, [addPeer, closePeer]);

  // Sesi aç / kapat
  useEffect(() => {
    if (!enabled) {
      socket.emit('voice:leave');
      [...peersRef.current.keys()].forEach(closePeer);
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
      setVoiceActive(false);
      setIsMuted(false);
      setVoicePeers(new Set());
      setIceError(false);
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setMicError('Tarayıcı mikrofonu desteklemiyor.');
      return;
    }

    let active = true;
    navigator.mediaDevices
      .getUserMedia({ audio: true, video: false })
      .then(stream => {
        if (!active) { stream.getTracks().forEach(t => t.stop()); return; }
        localStreamRef.current = stream;
        setMicError(null);
        setVoiceActive(true);
        console.log('[voice] mikrofon açıldı, odaya bildiriliyor...');
        socket.emit('voice:ready', (existingPeers: string[]) => {
          console.log('[voice] mevcut peers:', existingPeers);
          setVoicePeers(new Set(existingPeers));
        });
      })
      .catch(err => {
        if (active) {
          console.error('[voice] getUserMedia hatası:', err);
          setMicError('Mikrofon erişimi reddedildi.');
        }
      });

    return () => { active = false; };
  }, [enabled, closePeer]);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => {
      const next = !prev;
      localStreamRef.current?.getAudioTracks().forEach(t => { t.enabled = !next; });
      return next;
    });
  }, []);

  return { voiceActive, isMuted, micError, voicePeers, toggleMute, iceError };
}
