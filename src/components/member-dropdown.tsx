import { Feather } from '@expo/vector-icons';
import { memo, useRef, useState } from 'react';
import { Modal, Pressable, StatusBar, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Brand } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { playExpand, useReduceMotion } from '@/lib/reduce-motion';
import { formatCentsBRL } from '@/lib/format';
import type { MemberTotal } from '@/lib/billing';

interface Props {
  members: MemberTotal[];
  selected: string | null;
  onSelect: (memberId: string | null) => void;
}

export const MemberDropdown = memo(function MemberDropdown({ members, selected, onSelect }: Props) {
  const theme = useTheme();
  const reducedMotion = useReduceMotion();
  const [open, setOpen] = useState(false);
  const [top, setTop] = useState(0);
  const heightRef = useRef(40);
  const current = members.find((m) => m.memberId === selected);

  const openAtButton = (pageY: number, locationY: number) => {
    playExpand(reducedMotion, 180);
    // Modal posiciona a partir do topo físico; o toque vem relativo à área do app.
    setTop(pageY - locationY + heightRef.current + 6 - (StatusBar.currentHeight ?? 0));
    setOpen(true);
  };

  const pick = (id: string | null) => {
    setOpen(false);
    onSelect(id);
  };

  return (
    <View>
      <Pressable
        onLayout={(e) => {
          heightRef.current = e.nativeEvent.layout.height;
        }}
        onPress={(e) => openAtButton(e.nativeEvent.pageY, e.nativeEvent.locationY)}
        style={[
          styles.button,
          {
            borderColor: selected ? Brand.violet : theme.border,
            backgroundColor: selected ? theme.backgroundSelected : theme.backgroundElement,
          },
        ]}>
        <ThemedText type="small">{current ? `${current.nome} · ${formatCentsBRL(current.totalCentavos)}` : 'Todos'}</ThemedText>
        <Feather name={open ? 'chevron-up' : 'chevron-down'} size={16} color={theme.textSecondary} />
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.catcher} onPress={() => setOpen(false)}>
          <View
            style={[
              styles.list,
              { top, borderColor: theme.border, backgroundColor: theme.backgroundElement },
            ]}>
            <Pressable
              onPress={() => pick(null)}
              style={[
                styles.option,
                { borderColor: selected === null ? Brand.violet : theme.border },
                selected === null ? { backgroundColor: theme.backgroundSelected } : null,
              ]}>
              <ThemedText type="smallBold">Todos</ThemedText>
            </Pressable>
            {members.map((m) => (
              <Pressable
                key={m.memberId}
                onPress={() => pick(m.memberId)}
                style={[
                  styles.option,
                  { borderColor: selected === m.memberId ? Brand.violet : theme.border },
                  selected === m.memberId ? { backgroundColor: theme.backgroundSelected } : null,
                ]}>
                <ThemedText type={selected === m.memberId ? 'smallBold' : 'small'}>{m.nome}</ThemedText>
                <ThemedText type="small">{formatCentsBRL(m.totalCentavos)}</ThemedText>
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
});

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  catcher: { flex: 1 },
  list: {
    position: 'absolute',
    left: 30,
    right: 30,
    borderWidth: 1,
    borderRadius: 10,
    padding: 4,
    gap: 2,
    elevation: 8,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
  },
});
