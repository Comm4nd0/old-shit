import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { fetchComments, postComment, voteComment } from '../api/sites';
import { copy } from '../copy';
import { colors, spacing } from '../theme';
import type { Comment } from '../types';

interface Props {
  siteId: number;
  loggedIn: boolean;
  onRequireLogin: () => void;
}

export function CommentSection({ siteId, loggedIn, onRequireLogin }: Props) {
  const router = useRouter();
  const [comments, setComments] = useState<Comment[] | null>(null);
  const [draft, setDraft] = useState('');
  const [posting, setPosting] = useState(false);

  async function upvote(comment: Comment) {
    if (!loggedIn) {
      onRequireLogin();
      return;
    }
    try {
      const result = await voteComment(comment.id);
      setComments((current) =>
        (current ?? []).map((c) =>
          c.id === comment.id
            ? { ...c, upvotes: result.upvotes, upvoted_by_me: result.upvoted }
            : c
        )
      );
    } catch {
      // vote didn't land; leave the count alone
    }
  }

  useEffect(() => {
    fetchComments(siteId)
      .then((page) => setComments(page.results))
      .catch(() => setComments([]));
  }, [siteId]);

  async function submit() {
    const text = draft.trim();
    if (!text) return;
    if (!loggedIn) {
      onRequireLogin();
      return;
    }
    setPosting(true);
    try {
      const created = await postComment(siteId, text);
      setComments((current) => [created, ...(current ?? [])]);
      setDraft('');
    } finally {
      setPosting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{copy.detailComments}</Text>
      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          placeholder={copy.commentPlaceholder}
          placeholderTextColor={colors.faded}
          value={draft}
          onChangeText={setDraft}
          multiline
        />
        <Pressable style={styles.button} onPress={submit} disabled={posting}>
          <Text style={styles.buttonText}>{posting ? '…' : 'Post'}</Text>
        </Pressable>
      </View>
      {comments === null ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: spacing.lg }} />
      ) : comments.length === 0 ? (
        <Text style={styles.empty}>{copy.detailNoComments}</Text>
      ) : (
        comments.map((comment) => (
          <View key={comment.id} style={styles.comment}>
            <View style={styles.commentHeader}>
              <Pressable onPress={() => router.push(`/user/${comment.username}`)}>
                <Text style={styles.author}>{comment.username}</Text>
              </Pressable>
              <Pressable
                style={[styles.voteButton, comment.upvoted_by_me && styles.voteButtonActive]}
                onPress={() => upvote(comment)}
                hitSlop={6}
              >
                <Text
                  style={[styles.voteText, comment.upvoted_by_me && styles.voteTextActive]}
                >
                  ▲ {comment.upvotes}
                </Text>
              </Pressable>
            </View>
            <Text style={styles.text}>{comment.text}</Text>
          </View>
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: spacing.xl },
  title: { fontWeight: '700', color: colors.ink, fontSize: 16 },
  inputRow: { flexDirection: 'row', marginTop: spacing.sm, alignItems: 'flex-end' },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.card,
    padding: spacing.md,
    color: colors.ink,
    minHeight: 44,
  },
  button: {
    marginLeft: spacing.sm,
    backgroundColor: colors.accent,
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  buttonText: { color: '#fff', fontWeight: '700' },
  empty: { color: colors.faded, marginTop: spacing.md, fontStyle: 'italic' },
  comment: {
    marginTop: spacing.md,
    backgroundColor: colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  commentHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  author: { fontWeight: '700', color: colors.accentDark, fontSize: 13 },
  text: { color: colors.ink, marginTop: 2, lineHeight: 19 },
  voteButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  voteButtonActive: { backgroundColor: colors.gold, borderColor: colors.gold },
  voteText: { color: colors.faded, fontSize: 12, fontWeight: '700' },
  voteTextActive: { color: '#fff' },
});
