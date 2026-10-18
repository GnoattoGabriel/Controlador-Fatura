import qrcode from 'qrcode-generator';
import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

interface Props {
  /** Texto a codificar (BR Code / "Copia e Cola"). */
  value: string;
  /** Lado do QR em px (exclui a quiet zone). */
  size?: number;
  /** Margem branca ao redor (quiet zone) em px. */
  quietZone?: number;
}

/**
 * Renderiza o QR como grade de Views — evita re-adicionar `react-native-svg`
 * (que foi removido para manter o APK pequeno). Só as células escuras viram View;
 * o fundo branco do tile faz o papel das claras.
 */
export const QrCode = memo(function QrCode({ value, size = 220, quietZone = 12 }: Props) {
  const matrix = useMemo(() => {
    const qr = qrcode(0, 'M'); // 0 = versão automática; correção M (padrão de mercado)
    qr.addData(value);
    qr.make();
    const count = qr.getModuleCount();
    const rows: boolean[][] = [];
    for (let r = 0; r < count; r++) {
      const row: boolean[] = new Array(count);
      for (let c = 0; c < count; c++) row[c] = qr.isDark(r, c);
      rows.push(row);
    }
    return rows;
  }, [value]);

  return (
    <View
      style={[styles.tile, { width: size + quietZone * 2, height: size + quietZone * 2, padding: quietZone }]}
      // Accessibility: o QR é decorativo; o leitor de tela lê o valor na seção de texto.
      accessible={false}>
      <View style={[styles.grid, { width: size, height: size }]}>
        {matrix.map((row, r) => (
          <View key={r} style={styles.row}>
            {row.map((dark, c) => (
              <View key={c} style={[styles.cell, dark ? styles.dark : null]} />
            ))}
          </View>
        ))}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  tile: { backgroundColor: '#FFFFFF', borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  grid: { flexDirection: 'column' },
  row: { flex: 1, flexDirection: 'row' },
  cell: { flex: 1, backgroundColor: 'transparent' },
  dark: { backgroundColor: '#000000' },
});
