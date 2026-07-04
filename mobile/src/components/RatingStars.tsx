import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { postRating } from '../api/sites';
import { copy } from '../copy';
import { colors, spacing } from '../theme';

interface Props {
  siteId: number;
  userRating: number | null;
  averageRating: number | null;
  ratingCount: number;
  loggedIn: boolean;
  onRequireLogin: () => void;
}

export function RatingStars({
  siteId,
  userRating,
  averageRating,
  ratingCount,
  loggedIn,
  onRequireLogin,
}: Props) {
  const [mine, setMine] = useState<number | null>(userRating);
  const [average, setAverage] = useState<number | null>(averageRating);
  const [count, setCount] = useState(ratingCount);

  async function rate(value: number) {
    if (!loggedIn) {
      onRequireLogin();
      return;
    }
    const previous = mine;
    setMine(value); // optimistic
    try {
      const result = await postRating(siteId, value);
      setAverage(result.average_rating);
      setCount(result.rating_count);
    } catch {
      setMine(previous);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.prompt}>{copy.detailRatePrompt}</Text>
      <View style={styles.stars}>
        {[1, 2, 3, 4, 5].map((value) => (
          <Pressable key={value} onPress={() => rate(value)} hitSlop={6}>
            <Text style={[styles.star, mine !== null && value <= mine && styles.starActive]}>
              ★
            </Text>
          </Pressable>
        ))}
        <Text style={styles.summary}>
          {average !== null ? `${average} avg · ${count} ratings` : 'nobody has dared yet'}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: spacing.lg },
  prompt: { fontWeight: '700', color: colors.ink, fontSize: 16 },
  stars: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm },
  star: { fontSize: 30, color: colors.border, marginRight: 4 },
  starActive: { color: colors.gold },
  summary: { marginLeft: spacing.md, color: colors.faded, fontSize: 13 },
});
