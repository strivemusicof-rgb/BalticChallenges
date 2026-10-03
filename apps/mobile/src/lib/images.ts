import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { Linking, Platform } from 'react-native';
import { showAlert } from '@/lib/dialog';
import { i18n } from '@/lib/i18n';

const MAX_EDGE = 2048;

export type ImageSource = 'camera' | 'library';

/**
 * Lets the user take or pick a photo, then downsizes and re-encodes it to JPEG on device.
 * Re-encoding drops EXIF (including GPS); the server re-encodes again, so this is about upload size and privacy.
 * Returns a local file URI, or null if the user cancelled.
 */
export async function pickImage(source: ImageSource, options: { square?: boolean; maxEdge?: number } = {}) {
  const permission =
    source === 'camera'
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) {
    showAlert(
      source === 'camera' ? i18n.t('images.cameraNeeded') : i18n.t('images.photosNeeded'),
      i18n.t('images.allowInSettings'),
      [
        { text: i18n.t('images.notNow'), style: 'cancel' },
        { text: i18n.t('images.openSettings'), onPress: () => void Linking.openSettings() },
      ],
    );
    return null;
  }

  const launch = source === 'camera' ? ImagePicker.launchCameraAsync : ImagePicker.launchImageLibraryAsync;
  const result = await launch({
    mediaTypes: ['images'],
    allowsEditing: options.square ?? false,
    aspect: options.square ? [1, 1] : undefined,
    quality: 1,
    exif: false,
  });
  const asset = result.canceled ? null : result.assets[0];
  if (!asset) return null;

  const maxEdge = options.maxEdge ?? MAX_EDGE;
  const context = ImageManipulator.manipulate(asset.uri);
  if (Math.max(asset.width, asset.height) > maxEdge) {
    context.resize(asset.width >= asset.height ? { width: maxEdge } : { height: maxEdge });
  }
  const rendered = await context.renderAsync();
  const saved = await rendered.saveAsync({ format: SaveFormat.JPEG, compress: 0.82 });
  return saved.uri;
}

/** Shows a camera/library chooser and resolves with the processed image URI. */
export function chooseImage(options: { square?: boolean; maxEdge?: number } = {}): Promise<string | null> {
  // Browsers show their own camera/library chooser for file inputs.
  if (Platform.OS === 'web') return pickImage('library', options).catch(() => null);
  return new Promise((resolve) => {
    showAlert(i18n.t('images.addPhoto'), undefined, [
      { text: i18n.t('images.takePhoto'), onPress: () => void pickImage('camera', options).then(resolve, () => resolve(null)) },
      { text: i18n.t('images.chooseLibrary'), onPress: () => void pickImage('library', options).then(resolve, () => resolve(null)) },
      { text: i18n.t('common.cancel'), style: 'cancel', onPress: () => resolve(null) },
    ]);
  });
}
