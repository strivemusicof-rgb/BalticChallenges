import { memo, useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';

import { Glyph } from '@/components/ui/glyph';
import { Brand } from '@/constants/theme';
import type { Coordinates } from '@/hooks/use-location';
import { categoryColor } from '@/lib/format';
import { categoryGlyph } from '@/lib/glyphs';
import type { ChallengeSummary } from '@/lib/types';

export const BALTIC_REGION = { latitude: 57.0, longitude: 24.6, latitudeDelta: 6.5, longitudeDelta: 7.5 };

export interface MapFocus {
  lat: number;
  lng: number;
  /** Change this to re-run the camera move for the same point. */
  key: number;
}

export interface ChallengeMapProps {
  challenges: ChallengeSummary[];
  userCoords: Coordinates | null;
  selectedId: string | null;
  onSelect: (challenge: ChallengeSummary | null) => void;
  focus?: MapFocus | null;
  /** Draw a dashed line from the user to this point (GPS challenge mode). */
  routeTo?: { lat: number; lng: number } | null;
  dark?: boolean;
}

const Pin = memo(function Pin({ challenge, selected }: { challenge: ChallengeSummary; selected: boolean }) {
  const done = challenge.userStatus === 'completed';
  return (
    <View
      style={[
        styles.marker,
        { backgroundColor: done ? Brand.success : categoryColor(challenge.categoryId) },
        selected && styles.markerSelected,
      ]}>
      <Glyph name={done ? 'check-bold' : categoryGlyph(challenge.categoryId)} size={17} color="#FFFFFF" />
    </View>
  );
});

export function ChallengeMap({ challenges, userCoords, selectedId, onSelect, focus, routeTo, dark = false }: ChallengeMapProps) {
  const mapRef = useRef<MapView>(null);
  const centeredOnUser = useRef(false);
  const fittedRoute = useRef<string | null>(null);

  useEffect(() => {
    if (!routeTo) return;
    // Frame the route once per target (and once more when the first GPS fix arrives), not on every GPS tick.
    const key = `${routeTo.lat},${routeTo.lng},${userCoords ? 'user' : 'nouser'}`;
    if (fittedRoute.current === key) return;
    fittedRoute.current = key;
    const points = [{ latitude: routeTo.lat, longitude: routeTo.lng }];
    if (userCoords) points.push({ latitude: userCoords.lat, longitude: userCoords.lng });
    mapRef.current?.fitToCoordinates(points, { edgePadding: { top: 160, right: 60, bottom: 320, left: 60 }, animated: true });
  }, [routeTo, userCoords]);

  useEffect(() => {
    if (!userCoords || centeredOnUser.current || routeTo) return;
    centeredOnUser.current = true;
    mapRef.current?.animateToRegion(
      { latitude: userCoords.lat, longitude: userCoords.lng, latitudeDelta: 0.8, longitudeDelta: 0.8 },
      600,
    );
  }, [userCoords, routeTo]);

  useEffect(() => {
    if (!focus) return;
    mapRef.current?.animateToRegion({ latitude: focus.lat, longitude: focus.lng, latitudeDelta: 0.25, longitudeDelta: 0.25 }, 500);
  }, [focus]);

  return (
    <MapView
      ref={mapRef}
      style={StyleSheet.absoluteFill}
      initialRegion={BALTIC_REGION}
      showsUserLocation={userCoords !== null}
      showsMyLocationButton={false}
      showsCompass={false}
      toolbarEnabled={false}
      userInterfaceStyle={dark ? 'dark' : 'light'}
      onPress={(event) => {
        if (event.nativeEvent.action !== 'marker-press') onSelect(null);
      }}>
      {routeTo && userCoords && (
        <Polyline
          coordinates={[
            { latitude: userCoords.lat, longitude: userCoords.lng },
            { latitude: routeTo.lat, longitude: routeTo.lng },
          ]}
          strokeColor="#FFFFFF"
          strokeWidth={4}
          lineDashPattern={[2, 10]}
        />
      )}
      {challenges.map((challenge) =>
        challenge.place ? (
          <Marker
            key={challenge.id}
            coordinate={{ latitude: challenge.place.lat, longitude: challenge.place.lng }}
            onPress={() => onSelect(challenge)}
            tracksViewChanges={false}
            accessibilityLabel={challenge.title}>
            <Pin challenge={challenge} selected={selectedId === challenge.id} />
          </Marker>
        ) : null,
      )}
    </MapView>
  );
}

const styles = StyleSheet.create({
  marker: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  markerSelected: {
    transform: [{ scale: 1.25 }],
    borderColor: Brand.amber,
  },
});
