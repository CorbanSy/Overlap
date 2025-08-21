// _utils/storage/places.js
import { doc, getDoc, collection, getDocs } from 'firebase/firestore';
import { ref, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../FirebaseConfig';

// Convert degrees → radians
function toRad(d) {
  return (d * Math.PI) / 180
}

// Haversine formula (km)
function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371
  const dLat = toRad(lat2 - lat1)
  const dLng = toRad(lng2 - lng1)
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
}

export async function fetchPlacesNearby(userLat, userLng, maxKm = 5) {
  const snap = await getDocs(collection(db, 'places'))
  const all = snap.docs.map(d => ({ id: d.id, ...d.data() }))
  if (!isFinite(userLat) || !isFinite(userLng) || !maxKm) return all;
  return all.filter(p =>
    haversine(userLat, userLng, p.location.lat, p.location.lng) <= maxKm
  )
}

export async function fetchPlaceDetails(placeId) {
  const snap = await getDoc(doc(db, 'places', placeId))
  if (!snap.exists()) throw new Error('Place not found')
  return { id: snap.id, ...snap.data() }
}

export async function fetchPlacePhotos(place) {
  if (!Array.isArray(place.photos)) return []
  return Promise.all(
    place.photos.map(path =>
      getDownloadURL(ref(storage, path))
    )
  )
}
