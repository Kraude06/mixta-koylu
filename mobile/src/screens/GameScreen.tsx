import { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, FlatList,
  StyleSheet, KeyboardAvoidingView, Platform, ScrollView, Modal,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ROLE_INFO, ChatChannel, Message } from '@vampir-koylu/shared';
import { socket } from '../socket';
import { useGameStore } from '../store/gameStore';
import { RootStackParamList } from '../../App';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'Game'> };
type Tab = 'chat' | 'players' | 'notes';

export default function GameScreen({ navigation }: Props) {
  const {
    phase, dayNumber, players, messages, myId, myRole, myTeam,
    seerResults, winner, phaseEndTime, votes, error, clearError,
    hunterPlayerId, myNotes, setMyNotes,
  } = useGameStore();

  const [tab, setTab] = useState<Tab>('chat');
  const [input, setInput] = useState('');
  const [nightTarget, setNightTarget] = useState<string | undefined>();
  const [channel, setChannel] = useState<ChatChannel>('public');
  const [deadNotesModal, setDeadNotesModal] = useState<{ name: string; notes: string; role?: string } | null>(null);
  const [timer, setTimer] = useState<number | null>(null);
  const flatListRef = useRef<FlatList>(null);

  const me = myId ? players[myId] : undefined;
  const isAlive = me?.isAlive ?? false;
  const isVampire = myRole === 'vampire';
  const myVote = myId ? votes[myId] : undefined;
  const playerList = Object.values(players);
  const isHunterRevenge = phase === 'hunter-revenge' && hunterPlayerId === myId;

  useEffect(() => {
    if (phase === 'lobby') navigation.replace('Lobby');
  }, [phase, navigation]);

  useEffect(() => {
    if (!phaseEndTime) { setTimer(null); return; }
    const interval = setInterval(() => {
      setTimer(Math.max(0, Math.round((phaseEndTime - Date.now()) / 1000)));
    }, 1000);
    return () => clearInterval(interval);
  }, [phaseEndTime]);

  useEffect(() => {
    if (phase === 'day') setChannel('public');
    else if (phase === 'night' && isVampire) setChannel('vampire');
    setNightTarget(undefined);
  }, [phase, isVampire]);

  function sendMessage() {
    const text = input.trim();
    if (!text) return;
    socket.emit('chat:send', text, channel);
    setInput('');
  }

  function handleVote(targetId: string) {
    socket.emit('game:vote', targetId);
  }

  function handleNightAction(targetId: string) {
    setNightTarget(targetId);
    socket.emit('game:night-action', targetId);
  }

  function readDeadNotes(playerId: string, playerName: string, role?: string) {
    socket.emit('notes:read', playerId, (notes) => {
      setDeadNotesModal({ name: playerName, notes, role });
    });
  }

  const phaseLabel: Record<string, string> = {
    day: `☀️ Gündüz ${dayNumber}`,
    night: `🌙 Gece ${dayNumber}`,
    'hunter-revenge': '🏹 Avcı İntikamı',
    'game-over': '🎮 Oyun Bitti',
    lobby: '🏰 Lobi',
  };

  const canChat = isAlive && (
    channel === 'public' ? phase === 'day' : (isVampire && phase === 'night')
  );

  const visibleMessages = messages.filter((m) =>
    m.channel === 'system' || m.channel === 'public' || (m.channel === 'vampire' && isVampire)
  ).filter((m) => m.channel === channel || m.channel === 'system');

  function renderMessage({ item: m }: { item: Message }) {
    const isOwn = m.senderId === myId;
    const isSystem = m.channel === 'system';
    if (isSystem) return (
      <View style={styles.systemMsg}>
        <Text style={styles.systemText}>{m.content}</Text>
      </View>
    );
    return (
      <View style={[styles.msgRow, isOwn && styles.msgRowOwn]}>
        {!isOwn && <Text style={styles.senderName}>{m.senderName}</Text>}
        <View style={[styles.bubble, isOwn ? styles.bubbleOwn : m.channel === 'vampire' ? styles.bubbleVamp : styles.bubbleOther]}>
          <Text style={styles.bubbleText}>{m.content}</Text>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.phaseText}>{phaseLabel[phase] ?? phase}</Text>
        {timer !== null && (
          <Text style={[styles.timerText, timer <= 10 && styles.timerUrgent]}>
            {Math.floor(timer / 60).toString().padStart(2, '0')}:{(timer % 60).toString().padStart(2, '0')}
          </Text>
        )}
      </View>

      {winner && (
        <View style={[styles.winBanner, winner === 'vampire' ? styles.winBannerVamp : styles.winBannerVillage]}>
          <Text style={styles.winText}>{winner === 'vampire' ? '🧛 Vampirler Kazandı!' : '🏡 Köy Kurtuldu!'}</Text>
        </View>
      )}

      {myRole && (
        <View style={[styles.roleBar, myTeam === 'vampire' ? styles.roleBarVamp : styles.roleBarVillage]}>
          <Text style={styles.roleText}>{ROLE_INFO[myRole].icon} {ROLE_INFO[myRole].label}</Text>
        </View>
      )}

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['chat', 'players', 'notes'] as Tab[]).map((t) => (
          <TouchableOpacity key={t} style={[styles.tab, tab === t && styles.tabActive]} onPress={() => setTab(t)}>
            <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
              {t === 'chat' ? '💬' : t === 'players' ? '👥' : '📝'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Chat tab */}
      {tab === 'chat' && (
        <View style={styles.flex1}>
          {isVampire && (
            <View style={styles.channelSwitch}>
              {(['public', 'vampire'] as ChatChannel[]).map((ch) => (
                <TouchableOpacity key={ch} style={[styles.chBtn, channel === ch && styles.chBtnActive]} onPress={() => setChannel(ch)}>
                  <Text style={[styles.chBtnText, channel === ch && styles.chBtnTextActive]}>
                    {ch === 'public' ? '🏘️ Köy' : '🩸 Vampirler'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
          <FlatList
            ref={flatListRef}
            data={visibleMessages}
            keyExtractor={(m) => m.id}
            renderItem={renderMessage}
            onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
            contentContainerStyle={styles.msgList}
            style={styles.flex1}
          />
          <View style={styles.inputRow}>
            {!canChat ? (
              <Text style={styles.cantChat}>
                {!isAlive ? 'Öldün' : phase === 'night' && !isVampire ? '🌙 Uyuyorsun...' : 'Sessiz kal'}
              </Text>
            ) : (
              <>
                <TextInput
                  style={styles.chatInput}
                  value={input}
                  onChangeText={setInput}
                  placeholder={channel === 'vampire' ? '🩸 Vampirlere...' : 'Mesaj yaz...'}
                  placeholderTextColor="#555"
                  returnKeyType="send"
                  onSubmitEditing={sendMessage}
                  maxLength={500}
                />
                <TouchableOpacity style={styles.sendBtn} onPress={sendMessage} disabled={!input.trim()}>
                  <Text style={styles.sendBtnText}>↑</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      )}

      {/* Players tab */}
      {tab === 'players' && (
        <ScrollView style={styles.flex1} contentContainerStyle={styles.playerList}>
          {isHunterRevenge && (
            <Text style={styles.hunterPrompt}>🏹 Son kurbanını seç!</Text>
          )}
          {playerList.map((p) => {
            const sr = p.id !== myId ? seerResults[p.id] : undefined;
            const voteCount = Object.values(votes).filter((v) => v === p.id).length;
            return (
              <View key={p.id} style={[styles.playerCard, !p.isAlive && styles.playerCardDead]}>
                <View style={styles.playerCardRow}>
                  <View style={[styles.pAvatar, !p.isAlive && styles.pAvatarDead]}>
                    <Text style={styles.pAvatarText}>{p.isAlive ? p.name[0].toUpperCase() : '💀'}</Text>
                  </View>
                  <View style={styles.pInfo}>
                    <Text style={[styles.pName, !p.isAlive && styles.pNameDead]}>
                      {p.name}{p.id === myId ? ' (sen)' : ''}{p.isHost ? ' 👑' : ''}
                    </Text>
                    {p.role && <Text style={[styles.pRole, p.team === 'vampire' ? styles.pRoleVamp : styles.pRoleVillage]}>{ROLE_INFO[p.role]?.icon} {ROLE_INFO[p.role]?.label}</Text>}
                    {sr && <Text style={sr === 'vampire' ? styles.seerVamp : styles.seerVillage}>{sr === 'vampire' ? '🧛 Vampir!' : '✅ Masum'}</Text>}
                  </View>
                  {voteCount > 0 && <Text style={styles.voteCount}>{voteCount} oy</Text>}
                </View>

                {p.isAlive && p.id !== myId && phase === 'day' && isAlive && (
                  <TouchableOpacity style={[styles.actionBtn, myVote === p.id && styles.actionBtnActive]} onPress={() => handleVote(p.id)}>
                    <Text style={styles.actionBtnText}>{myVote === p.id ? '🗳️ Oylandı' : '🗳️ Oyla'}</Text>
                  </TouchableOpacity>
                )}
                {p.isAlive && p.id !== myId && phase === 'night' && isAlive && myRole !== 'villager' && (
                  <TouchableOpacity style={[styles.actionBtn, nightTarget === p.id && styles.actionBtnActive]} onPress={() => handleNightAction(p.id)}>
                    <Text style={styles.actionBtnText}>{nightTarget === p.id ? '✓ Seçildi' : ROLE_INFO[myRole!]?.abilityLabel ?? 'Seç'}</Text>
                  </TouchableOpacity>
                )}
                {p.isAlive && p.id !== myId && isHunterRevenge && (
                  <TouchableOpacity style={styles.hunterBtn} onPress={() => socket.emit('game:hunter-shot', p.id)}>
                    <Text style={styles.hunterBtnText}>🏹 Vur</Text>
                  </TouchableOpacity>
                )}
                {!p.isAlive && (
                  <TouchableOpacity style={styles.notesBtn} onPress={() => readDeadNotes(p.id, p.name, p.role ? ROLE_INFO[p.role]?.label : undefined)}>
                    <Text style={styles.notesBtnText}>📖 Notlara Bak</Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Notes tab */}
      {tab === 'notes' && (
        <View style={styles.flex1}>
          <Text style={styles.notesHint}>Notların öldüğünde herkese görünür.</Text>
          <TextInput
            style={styles.notesInput}
            value={myNotes}
            onChangeText={setMyNotes}
            placeholder={"Özel notlarını buraya yaz...\nŞüpheliler, stratejin, gözlemler..."}
            placeholderTextColor="#444"
            multiline
            maxLength={2000}
          />
        </View>
      )}

      {/* Dead player notes modal */}
      <Modal visible={!!deadNotesModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>📖 {deadNotesModal?.name}</Text>
            {deadNotesModal?.role && <Text style={styles.modalRole}>Rol: {deadNotesModal.role}</Text>}
            <Text style={styles.modalNotes}>{deadNotesModal?.notes || '(Not bırakmamış)'}</Text>
            <TouchableOpacity style={styles.modalClose} onPress={() => setDeadNotesModal(null)}>
              <Text style={styles.modalCloseText}>Kapat</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#07070f' },
  flex1: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#1a1a2e', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  phaseText: { color: '#e2d9f3', fontWeight: 'bold', fontSize: 16 },
  timerText: { color: '#aaa', fontSize: 18, fontFamily: 'monospace', fontWeight: 'bold' },
  timerUrgent: { color: '#f87171' },
  winBanner: { paddingVertical: 10, alignItems: 'center', borderBottomWidth: 1 },
  winBannerVamp: { backgroundColor: 'rgba(127,29,29,0.7)', borderBottomColor: '#991b1b' },
  winBannerVillage: { backgroundColor: 'rgba(20,83,45,0.5)', borderBottomColor: '#166534' },
  winText: { fontWeight: 'bold', fontSize: 17, color: '#f0e8d0' },
  roleBar: { paddingHorizontal: 16, paddingVertical: 6, borderBottomWidth: 1 },
  roleBarVamp: { backgroundColor: 'rgba(127,29,29,0.4)', borderBottomColor: '#7f1d1d' },
  roleBarVillage: { backgroundColor: 'rgba(20,83,45,0.2)', borderBottomColor: '#166534' },
  roleText: { color: '#e2d9f3', fontSize: 13, fontWeight: '600' },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.1)' },
  tab: { flex: 1, alignItems: 'center', paddingVertical: 10 },
  tabActive: { borderBottomWidth: 2, borderBottomColor: '#cc0000' },
  tabText: { fontSize: 18, opacity: 0.4 },
  tabTextActive: { opacity: 1 },
  channelSwitch: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.08)' },
  chBtn: { flex: 1, alignItems: 'center', paddingVertical: 8 },
  chBtnActive: { borderBottomWidth: 2, borderBottomColor: '#cc0000' },
  chBtnText: { color: '#555', fontSize: 12, fontWeight: '600' },
  chBtnTextActive: { color: '#e2d9f3' },
  msgList: { padding: 12, gap: 8 },
  msgRow: { alignItems: 'flex-start' },
  msgRowOwn: { alignItems: 'flex-end' },
  senderName: { color: '#666', fontSize: 11, marginBottom: 2, marginLeft: 4 },
  bubble: { maxWidth: '78%', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18 },
  bubbleOwn: { backgroundColor: '#7f1d1d', borderBottomRightRadius: 4 },
  bubbleOther: { backgroundColor: '#1a1a2e', borderBottomLeftRadius: 4 },
  bubbleVamp: { backgroundColor: '#2d0a1a', borderWidth: 1, borderColor: '#7f1d1d', borderBottomLeftRadius: 4 },
  bubbleText: { color: '#f0e8d0', fontSize: 14 },
  systemMsg: { alignItems: 'center', marginVertical: 4 },
  systemText: { color: '#555', fontSize: 12, fontStyle: 'italic', backgroundColor: '#111', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 100 },
  inputRow: { flexDirection: 'row', padding: 10, gap: 8, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)' },
  cantChat: { flex: 1, textAlign: 'center', color: '#444', paddingVertical: 12 },
  chatInput: { flex: 1, backgroundColor: '#1a1a2e', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10, color: '#fff', fontSize: 14 },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#991b1b', alignItems: 'center', justifyContent: 'center' },
  sendBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 20 },
  playerList: { padding: 12, gap: 10 },
  playerCard: { backgroundColor: '#1a1a2e', borderRadius: 14, padding: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', gap: 8 },
  playerCardDead: { opacity: 0.55, backgroundColor: '#0f0f1a' },
  playerCardRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  pAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#7f1d1d', alignItems: 'center', justifyContent: 'center' },
  pAvatarDead: { backgroundColor: '#1f2937' },
  pAvatarText: { color: '#fca5a5', fontWeight: 'bold', fontSize: 17 },
  pInfo: { flex: 1 },
  pName: { color: '#e5e7eb', fontWeight: '600', fontSize: 14 },
  pNameDead: { color: '#6b7280' },
  pRole: { fontSize: 12 },
  pRoleVamp: { color: '#f87171' },
  pRoleVillage: { color: '#86efac' },
  seerVamp: { color: '#f87171', fontSize: 12, fontWeight: '600' },
  seerVillage: { color: '#86efac', fontSize: 12, fontWeight: '600' },
  voteCount: { color: '#f87171', fontWeight: 'bold', fontSize: 13 },
  actionBtn: { borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', paddingVertical: 6, alignItems: 'center' },
  actionBtnActive: { backgroundColor: 'rgba(127,29,29,0.5)', borderColor: '#cc0000' },
  actionBtnText: { color: '#ccc', fontSize: 13 },
  hunterBtn: { borderRadius: 8, backgroundColor: 'rgba(124,45,18,0.5)', borderWidth: 1, borderColor: '#c2410c', paddingVertical: 6, alignItems: 'center' },
  hunterBtnText: { color: '#fb923c', fontWeight: 'bold', fontSize: 13 },
  hunterPrompt: { color: '#fb923c', fontWeight: 'bold', textAlign: 'center', fontSize: 16, marginBottom: 8 },
  notesBtn: { borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)', paddingVertical: 6, alignItems: 'center' },
  notesBtnText: { color: '#6b7280', fontSize: 12 },
  notesHint: { color: '#555', fontSize: 12, paddingHorizontal: 12, paddingTop: 8 },
  notesInput: { flex: 1, color: '#9ca3af', fontSize: 14, padding: 14, fontFamily: 'monospace', textAlignVertical: 'top' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 24 },
  modalCard: { backgroundColor: '#1a1a2e', borderRadius: 20, padding: 24, width: '100%', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', gap: 12 },
  modalTitle: { color: '#f0e8d0', fontSize: 20, fontWeight: 'bold' },
  modalRole: { color: '#f87171', fontSize: 14 },
  modalNotes: { color: '#9ca3af', fontSize: 14, lineHeight: 22, minHeight: 80 },
  modalClose: { backgroundColor: '#991b1b', borderRadius: 10, padding: 12, alignItems: 'center' },
  modalCloseText: { color: '#fff', fontWeight: 'bold' },
});
