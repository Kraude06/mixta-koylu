import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { socket } from '../socket';
import { useGameStore } from '../store/gameStore';
import { RootStackParamList } from '../../App';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'Home'> };

export default function HomeScreen({ navigation }: Props) {
  const { setMyId, setMyName } = useGameStore();
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [mode, setMode] = useState<'menu' | 'create' | 'join'>('menu');
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState('');

  function connect(action: () => void) {
    if (!socket.connected) { socket.connect(); socket.once('connect', action); }
    else action();
  }

  function handleCreate() {
    if (!name.trim()) return setErr('İsim gir.');
    setLoading(true);
    connect(() => {
      socket.emit('room:create', name.trim(), (roomCode, playerId) => {
        setMyId(playerId); setMyName(name.trim()); setLoading(false);
        navigation.replace('Lobby');
      });
    });
  }

  function handleJoin() {
    if (!name.trim()) return setErr('İsim gir.');
    if (!code.trim()) return setErr('Oda kodu gir.');
    setLoading(true);
    connect(() => {
      socket.emit('room:join', code.toUpperCase(), name.trim(), (ok, error) => {
        setLoading(false);
        if (!ok) { setErr(error ?? 'Bağlanılamadı.'); return; }
        setMyId(socket.id ?? ''); setMyName(name.trim());
        navigation.replace('Lobby');
      });
    });
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <Text style={styles.emoji}>🧛</Text>
        <Text style={styles.title}>Vampir Köylü</Text>
        <Text style={styles.subtitle}>Köyü kurtarabilecek misin?</Text>

        {mode === 'menu' && (
          <View style={styles.buttonGroup}>
            <TouchableOpacity style={styles.btnPrimary} onPress={() => setMode('create')}>
              <Text style={styles.btnPrimaryText}>➕ Oda Oluştur</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnGhost} onPress={() => setMode('join')}>
              <Text style={styles.btnGhostText}>🚪 Odaya Katıl</Text>
            </TouchableOpacity>
          </View>
        )}

        {(mode === 'create' || mode === 'join') && (
          <View style={styles.card}>
            <TouchableOpacity onPress={() => { setMode('menu'); setErr(''); }}>
              <Text style={styles.back}>← Geri</Text>
            </TouchableOpacity>
            <Text style={styles.cardTitle}>{mode === 'create' ? '➕ Oda Oluştur' : '🚪 Odaya Katıl'}</Text>
            <TextInput
              style={styles.input}
              placeholder="Oyuncu adın"
              placeholderTextColor="#555"
              maxLength={20}
              value={name}
              onChangeText={(t) => { setName(t); setErr(''); }}
            />
            {mode === 'join' && (
              <TextInput
                style={[styles.input, styles.codeInput]}
                placeholder="ODA KODU"
                placeholderTextColor="#555"
                maxLength={6}
                autoCapitalize="characters"
                value={code}
                onChangeText={(t) => { setCode(t.toUpperCase()); setErr(''); }}
              />
            )}
            {!!err && <Text style={styles.error}>{err}</Text>}
            <TouchableOpacity
              style={[styles.btnPrimary, loading && styles.btnDisabled]}
              disabled={loading}
              onPress={mode === 'create' ? handleCreate : handleJoin}
            >
              <Text style={styles.btnPrimaryText}>
                {loading ? 'Bağlanıyor...' : mode === 'create' ? 'Oluştur' : 'Katıl'}
              </Text>
            </TouchableOpacity>
          </View>
        )}
        <Text style={styles.footer}>4–16 oyuncu • Sıra tabanlı • Çok oyunculu</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#07070f' },
  scroll: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emoji: { fontSize: 80, marginBottom: 8 },
  title: { fontSize: 36, fontWeight: 'bold', color: '#cc0000', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#666', marginBottom: 40 },
  buttonGroup: { width: '100%', gap: 12 },
  card: { width: '100%', backgroundColor: '#1a1a2e', borderRadius: 16, padding: 20, gap: 12, borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)' },
  cardTitle: { fontSize: 20, fontWeight: 'bold', color: '#f87171' },
  back: { color: '#555', fontSize: 13 },
  input: { backgroundColor: '#0f0f1a', borderWidth: 1, borderColor: 'rgba(255,255,255,0.15)', borderRadius: 10, padding: 12, color: '#fff', fontSize: 16 },
  codeInput: { textAlign: 'center', letterSpacing: 8, fontSize: 22, fontWeight: 'bold' },
  error: { color: '#f87171', fontSize: 13 },
  btnPrimary: { backgroundColor: '#991b1b', borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#cc0000' },
  btnPrimaryText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  btnDisabled: { opacity: 0.4 },
  btnGhost: { borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255,255,255,0.2)' },
  btnGhostText: { color: '#ccc', fontWeight: '600', fontSize: 16 },
  footer: { marginTop: 40, color: '#333', fontSize: 12 },
});
