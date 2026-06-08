import { useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, StyleSheet, Share } from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { socket } from '../socket';
import { useGameStore } from '../store/gameStore';
import { RootStackParamList } from '../../App';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'Lobby'> };

export default function LobbyScreen({ navigation }: Props) {
  const { roomCode, players, myId, phase } = useGameStore();

  useEffect(() => {
    if (phase !== 'lobby') navigation.replace('Game');
  }, [phase, navigation]);

  const playerList = Object.values(players);
  const me = myId ? players[myId] : undefined;
  const isHost = me?.isHost ?? false;

  async function shareCode() {
    await Share.share({ message: `Vampir Köylü odasına katıl! Kod: ${roomCode}` });
  }

  return (
    <View style={styles.container}>
      <View style={styles.codeCard}>
        <Text style={styles.codeLabel}>Oda Kodu</Text>
        <Text style={styles.code}>{roomCode}</Text>
        <TouchableOpacity style={styles.shareBtn} onPress={shareCode}>
          <Text style={styles.shareBtnText}>📤 Paylaş</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Oyuncular ({playerList.length}/16)</Text>
        <FlatList
          data={playerList}
          keyExtractor={(p) => p.id}
          renderItem={({ item: p }) => (
            <View style={styles.playerRow}>
              <View style={styles.avatar}>
                <Text style={styles.avatarText}>{p.name[0].toUpperCase()}</Text>
              </View>
              <Text style={styles.playerName}>{p.name}</Text>
              {p.isHost && <Text style={styles.hostBadge}>👑 Lider</Text>}
              {p.id === myId && <Text style={styles.meBadge}>(sen)</Text>}
            </View>
          )}
          style={{ maxHeight: 300 }}
        />
      </View>

      {isHost ? (
        <TouchableOpacity
          style={[styles.startBtn, playerList.length < 4 && styles.btnDisabled]}
          disabled={playerList.length < 4}
          onPress={() => socket.emit('game:start', {})}
        >
          <Text style={styles.startBtnText}>
            {playerList.length < 4
              ? `${4 - playerList.length} oyuncu daha lazım`
              : '🎮 Oyunu Başlat'}
          </Text>
        </TouchableOpacity>
      ) : (
        <Text style={styles.waitingText}>Oda sahibinin başlatması bekleniyor...</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#07070f', padding: 16, gap: 12 },
  codeCard: { backgroundColor: '#1a1a2e', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)', alignItems: 'center' },
  codeLabel: { color: '#666', fontSize: 13, marginBottom: 4 },
  code: { fontSize: 40, fontWeight: 'bold', letterSpacing: 12, color: '#f87171', fontFamily: 'monospace' },
  shareBtn: { marginTop: 8, borderRadius: 8, borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)', paddingHorizontal: 16, paddingVertical: 6 },
  shareBtnText: { color: '#ccc', fontSize: 13 },
  card: { backgroundColor: '#1a1a2e', borderRadius: 16, padding: 16, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  sectionTitle: { color: '#ccc', fontWeight: '600', fontSize: 16, marginBottom: 10 },
  playerRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
  avatar: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#7f1d1d', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: '#fca5a5', fontWeight: 'bold', fontSize: 16 },
  playerName: { color: '#e5e7eb', flex: 1 },
  hostBadge: { color: '#f87171', fontSize: 12, fontWeight: '600' },
  meBadge: { color: '#555', fontSize: 12 },
  startBtn: { backgroundColor: '#991b1b', borderRadius: 14, padding: 18, alignItems: 'center', borderWidth: 1, borderColor: '#cc0000' },
  startBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 17 },
  btnDisabled: { opacity: 0.4 },
  waitingText: { textAlign: 'center', color: '#555', paddingVertical: 16 },
});
