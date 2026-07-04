import React, { useState } from 'react';
import { Pressable, Share, StyleSheet, Text, View } from 'react-native';

import { checkIn, undoCheckIn } from '../api/sites';
import { copy } from '../copy';
import { colors, spacing } from '../theme';

interface Props {
  siteId: number;
  siteName: string;
  shareUrl: string;
  initialVisited: boolean;
  initialVisitCount: number;
  loggedIn: boolean;
  onRequireLogin: () => void;
}

export function SocialBar({
  siteId,
  siteName,
  shareUrl,
  initialVisited,
  initialVisitCount,
  loggedIn,
  onRequireLogin,
}: Props) {
  const [visited, setVisited] = useState(initialVisited);
  const [visitCount, setVisitCount] = useState(initialVisitCount);

  async function toggleVisit() {
    if (!loggedIn) {
      onRequireLogin();
      return;
    }
    try {
      const result = visited ? await undoCheckIn(siteId) : await checkIn(siteId);
      setVisited(result.visited);
      setVisitCount(result.visit_count);
    } catch {
      // leave state as-is; the button can be tapped again
    }
  }

  async function share() {
    const message = copy.shareMessage(siteName, shareUrl);
    try {
      await Share.share({ message, url: shareUrl });
    } catch {
      // user dismissed the share sheet, or web without share support
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Pressable
          style={[styles.button, visited ? styles.buttonDone : styles.buttonCheckIn]}
          onPress={toggleVisit}
        >
          <Text style={styles.buttonText}>
            {visited ? copy.checkedInButton : `📍 ${copy.checkInButton}`}
          </Text>
        </Pressable>
        <Pressable style={[styles.button, styles.buttonShare]} onPress={share}>
          <Text style={styles.buttonText}>📣 {copy.shareButton}</Text>
        </Pressable>
      </View>
      <Text style={styles.count}>{copy.visitCountLabel(visitCount)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: spacing.md },
  row: { flexDirection: 'row', gap: spacing.sm },
  button: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    alignItems: 'center',
  },
  buttonCheckIn: { backgroundColor: colors.accentDark },
  buttonDone: { backgroundColor: colors.gold },
  buttonShare: { backgroundColor: colors.stone },
  buttonText: { color: '#fff', fontWeight: '700', fontSize: 13, textAlign: 'center' },
  count: { color: colors.faded, fontSize: 12, marginTop: spacing.sm, textAlign: 'center' },
});
