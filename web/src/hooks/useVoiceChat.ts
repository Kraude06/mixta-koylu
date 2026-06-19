import { useEffect, useRef, useState, useCallback } from 'react';
import { socket } from '../socket';
import type { VoiceSDP, VoiceICE } from '@vampir-koylu/shared';

const ICE_CONFIG: RTCConfiguration = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
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
}

export function useVoiceChat(enabled: boolean, permittedPeers: Set<string>): VoiceChatState {
  const localStreamRef = useRef<MediaStream | null>(null);
  const peersRef = useRef(new Map<string, Peer>());
  const permittedRef = useRef(permittedPeers);

  const [voiceActive, setVoiceActive] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [micError, setMicError] = useState<string | null>(null);
  const [voicePeers, setVoicePeers] = useState<Set<string>>(new Set());

  useEffect(() => { permittedRef.current = permittedPeers; }, [permittedPeers]);

  // Mute/unmute remote streams when phase-based permissions change
  useEffect(() => {
    peersRef.current.forEach((peer, peerId) => {
      peer.audio.muted = !permittedPeers.has(peerId);
    });
  }, [permittedPeers]);

  const closePeer = useCallback((peerId: string) => {
    const peer = peersRef.current.get(peerId);
    if (!peer) return;
    peer.pc.close();
    peer.audio.pause();
    peer.audio.srcObject = null;
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
    const audio = new Audio();
    audio.autoplay = true;
    audio.muted = !permittedRef.current.has(peerId);
    peersRef.current.set(peerId, { pc, audio });

    localStreamRef.current?.getTracks().forEach(t => {
      pc.addTrack(t, localStreamRef.current!);
    });

    pc.ontrack = (e) => {
      const peer = peersRef.current.get(peerId);
      if (!peer) return;
      peer.audio.srcObject = e.streams[0];
      peer.audio.muted = !permittedRef.current.has(peerId);
    };

    pc.onicecandidate = (e) => {
      if (!e.candidate) return;
      const ice: VoiceICE = {
        candidate: e.candidate.candidate,
        sdpMid: e.candidate.sdpMid,
        sdpMLineIndex: e.candidate.sdpMLineIndex,
        usernameFragment: e.candidate.usernameFragment,
      };
      socket.emit('voice:ice', peerId, ice);
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        closePeer(peerId);
      }
    };

    return pc;
  }, [closePeer]);

  // Socket event listeners (stable for component lifetime)
  useEffect(() => {
    const onPeerReady = async (peerId: string) => {
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

    const onPeerLeft = (peerId: string) => closePeer(peerId);

    const onOffer = async (from: string, sdp: VoiceSDP) => {
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
      const peer = peersRef.current.get(from);
      if (!peer) return;
      try {
        await peer.pc.setRemoteDescription(new RTCSessionDescription(sdp as RTCSessionDescriptionInit));
      } catch {}
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

  // Enable / disable voice
  useEffect(() => {
    if (!enabled) {
      socket.emit('voice:leave');
      [...peersRef.current.keys()].forEach(closePeer);
      localStreamRef.current?.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
      setVoiceActive(false);
      setIsMuted(false);
      setVoicePeers(new Set());
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
        socket.emit('voice:ready', (existingPeers: string[]) => {
          setVoicePeers(new Set(existingPeers));
        });
      })
      .catch(() => {
        if (active) setMicError('Mikrofon erişimi reddedildi.');
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

  return { voiceActive, isMuted, micError, voicePeers, toggleMute };
}
