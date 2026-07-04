import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
  Alert,
  Image,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { postPhoto } from '../api/sites';
import { copy } from '../copy';
import { colors, spacing } from '../theme';
import type { SitePhoto } from '../types';

interface Props {
  siteId: number;
  initialPhotos: SitePhoto[];
  loggedIn: boolean;
  onRequireLogin: () => void;
}

async function buildForm(asset: ImagePicker.ImagePickerAsset, caption: string): Promise<FormData> {
  const form = new FormData();
  const name = asset.fileName ?? 'photo.jpg';
  const type = asset.mimeType ?? 'image/jpeg';
  if (Platform.OS === 'web') {
    const blob = await (await fetch(asset.uri)).blob();
    form.append('image', new File([blob], name, { type }));
  } else {
    // React Native FormData accepts {uri, name, type} file descriptors.
    form.append('image', { uri: asset.uri, name, type } as unknown as Blob);
  }
  form.append('caption', caption);
  return form;
}

export function PhotoGrid({ siteId, initialPhotos, loggedIn, onRequireLogin }: Props) {
  const [photos, setPhotos] = useState<SitePhoto[]>(initialPhotos);
  const [caption, setCaption] = useState('');
  const [uploading, setUploading] = useState(false);

  async function pickAndUpload() {
    if (!loggedIn) {
      onRequireLogin();
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.7,
    });
    if (result.canceled || !result.assets[0]) return;
    setUploading(true);
    try {
      const form = await buildForm(result.assets[0], caption.trim());
      const created = await postPhoto(siteId, form);
      setPhotos((current) => [created, ...current]);
      setCaption('');
    } catch {
      Alert.alert('Upload failed', 'The photo refused to become history. Try again.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{copy.detailYourPhotos}</Text>
      {photos.length === 0 ? (
        <Text style={styles.empty}>{copy.detailNoPhotos}</Text>
      ) : (
        <View style={styles.grid}>
          {photos.map((photo) => (
            <Image key={photo.id} source={{ uri: photo.image }} style={styles.thumb} />
          ))}
        </View>
      )}
      <TextInput
        style={styles.captionInput}
        placeholder={copy.uploadCaptionPlaceholder}
        placeholderTextColor={colors.faded}
        value={caption}
        onChangeText={setCaption}
      />
      <Pressable style={styles.button} onPress={pickAndUpload} disabled={uploading}>
        <Text style={styles.buttonText}>
          {uploading ? 'Uploading…' : `📷 ${copy.uploadPhotoButton}`}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: spacing.xl },
  title: { fontWeight: '700', color: colors.ink, fontSize: 16 },
  empty: { color: colors.faded, marginTop: spacing.sm, fontStyle: 'italic' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.sm, gap: 6 },
  thumb: { width: '31%', aspectRatio: 1, borderRadius: 8, backgroundColor: colors.border },
  captionInput: {
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 10,
    backgroundColor: colors.card,
    padding: spacing.md,
    color: colors.ink,
  },
  button: {
    marginTop: spacing.sm,
    backgroundColor: colors.stone,
    borderRadius: 10,
    padding: spacing.md,
    alignItems: 'center',
  },
  buttonText: { color: '#fff', fontWeight: '700' },
});
