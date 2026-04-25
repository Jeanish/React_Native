/**
 * Salon photo upload + display grid for owners.
 * Handles picker → upload → delete. Parent owns the salon id and refreshes on change.
 */
import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { launchImageLibrary, launchCamera, ImagePickerResponse } from 'react-native-image-picker';
import { Colors, Typography, Spacing, Radius } from '../../constants/theme';
import { uploadSalonImages, deleteSalonImage, type ApiSalonImage } from '../../services/api/salon.service';

interface Props {
  salonId: string;
  images: ApiSalonImage[];
  onChange: () => void;
  maxImages?: number;
}

export function SalonPhotoManager({ salonId, images, onChange, maxImages = 6 }: Props) {
  const [busy, setBusy] = useState(false);
  const remaining = maxImages - images.length;

  async function handlePicked(res: ImagePickerResponse) {
    if (res.didCancel || !res.assets?.length) return;
    const valid = res.assets.filter(a => a.uri).slice(0, remaining);
    if (!valid.length) return;
    setBusy(true);
    const result = await uploadSalonImages(
      salonId,
      valid.map(a => ({ uri: a.uri!, type: a.type, fileName: a.fileName })),
    );
    setBusy(false);
    if (result.error) Alert.alert('Upload failed', result.error);
    else onChange();
  }

  function pickFromGallery() {
    if (remaining <= 0) return Alert.alert('Limit reached', `Max ${maxImages} photos.`);
    launchImageLibrary(
      { mediaType: 'photo', selectionLimit: Math.min(remaining, 6), quality: 0.8 },
      handlePicked,
    );
  }

  function pickFromCamera() {
    if (remaining <= 0) return Alert.alert('Limit reached', `Max ${maxImages} photos.`);
    launchCamera({ mediaType: 'photo', quality: 0.8, saveToPhotos: true }, handlePicked);
  }

  function confirmDelete(img: ApiSalonImage) {
    if (!img._id) return;
    Alert.alert('Delete photo?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          setBusy(true);
          const result = await deleteSalonImage(salonId, img._id!);
          setBusy(false);
          if (result.error) Alert.alert('Delete failed', result.error);
          else onChange();
        },
      },
    ]);
  }

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Photos</Text>
        <Text style={styles.counter}>{images.length} / {maxImages}</Text>
      </View>
      <Text style={styles.hint}>
        Add 2–3 clear photos of your salon interior and entrance. First photo is shown in search.
      </Text>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        {images.map((img, i) => (
          <TouchableOpacity
            key={img._id ?? img.url}
            style={styles.tile}
            activeOpacity={0.85}
            onLongPress={() => confirmDelete(img)}>
            <Image source={{ uri: img.url }} style={styles.img} />
            {i === 0 && <View style={styles.primaryBadge}><Text style={styles.primaryText}>PRIMARY</Text></View>}
          </TouchableOpacity>
        ))}

        {remaining > 0 && (
          <>
            <TouchableOpacity style={styles.addTile} onPress={pickFromGallery} activeOpacity={0.7} disabled={busy}>
              <Text style={styles.addIcon}>🖼️</Text>
              <Text style={styles.addLabel}>Gallery</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.addTile} onPress={pickFromCamera} activeOpacity={0.7} disabled={busy}>
              <Text style={styles.addIcon}>📷</Text>
              <Text style={styles.addLabel}>Camera</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>

      {busy && (
        <View style={styles.overlay}>
          <ActivityIndicator color={Colors.white} size="large" />
          <Text style={styles.overlayText}>Uploading…</Text>
        </View>
      )}
      {images.length > 0 && <Text style={styles.deleteHint}>Long-press a photo to delete</Text>}
    </View>
  );
}

const TILE_SIZE = 110;

const styles = StyleSheet.create({
  wrap: { marginTop: Spacing[4] },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: Typography.base, fontWeight: Typography.bold, color: Colors.textPrimary },
  counter: { fontSize: Typography.sm, fontWeight: Typography.semibold, color: Colors.textSecondary },
  hint: { fontSize: Typography.xs, color: Colors.textSecondary, marginTop: 4, marginBottom: Spacing[3] },
  scroll: { gap: Spacing[2], paddingRight: Spacing[2] },
  tile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    backgroundColor: Colors.borderLight,
  },
  img: { width: '100%', height: '100%' },
  primaryBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: Colors.navigationRed,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: Radius.full,
  },
  primaryText: { color: Colors.white, fontSize: 9, fontWeight: Typography.bold, letterSpacing: 0.5 },
  addTile: {
    width: TILE_SIZE,
    height: TILE_SIZE,
    borderRadius: Radius.lg,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.navigationRed,
    backgroundColor: '#FFF5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addIcon: { fontSize: 28, marginBottom: 4 },
  addLabel: { fontSize: Typography.xs, fontWeight: Typography.bold, color: Colors.navigationRed },
  overlay: {
    position: 'absolute',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: Radius.lg,
  },
  overlayText: { color: Colors.white, marginTop: Spacing[2], fontWeight: Typography.semibold },
  deleteHint: { fontSize: Typography.xs, color: Colors.textSecondary, marginTop: Spacing[2], textAlign: 'center' },
});
