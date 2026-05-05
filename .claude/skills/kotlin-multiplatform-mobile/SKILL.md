---
name: kotlin-multiplatform-mobile
description: Kotlin Multiplatform Mobile (KMP) for ULP driver app. Use when implementing shared business logic for Android plus iOS, GPS tracking, offline-first sync, POD photo capture, barcode scanning. Covers Compose Multiplatform UI, Ktor client, SQLDelight local database, Koin DI, expect/actual platform code. Always prefer KMP shared module over duplicated platform code.
---

# Kotlin Multiplatform Mobile (KMP) for ULP Driver App

## When this skill triggers
Building any feature for the ULP driver mobile app. Shared business logic targets Android + iOS via KMP. UI is Compose Multiplatform (Android) + SwiftUI bridge (iOS).

## Top 3 reference repos
1. **JetBrains/kotlin-multiplatform-samples** (https://github.com/Kotlin/kotlin-multiplatform-samples) - Official KMP samples. The `kmm-production-sample/` is closest to ULP.
2. **icerockdev/moko-template** (https://github.com/icerockdev/moko-template) - Production KMP template with networking, DI, MVVM, navigation.
3. **JetBrains/compose-multiplatform** (https://github.com/JetBrains/compose-multiplatform) - Compose for iOS - cross-platform UI.

## Standard KMP project structure

```
mobile/
  shared/                            # KMP shared module
    src/commonMain/kotlin/           # Shared business logic
      domain/Trip.kt                 # Trip aggregate
      data/TripRepository.kt
      data/local/TripDao.kt          # SQLDelight DAO
      data/remote/TripApi.kt         # Ktor client
      use_cases/DispatchTripUseCase.kt
    src/androidMain/kotlin/          # Android-specific (FusedLocationProvider)
    src/iosMain/kotlin/              # iOS-specific (CLLocationManager)
  androidApp/                        # Android app (Compose)
  iosApp/                            # iOS app (SwiftUI + KMP bridge)
```

## Shared API client (Ktor)

```kotlin
class UlpApiClient(baseUrl: String, private val authProvider: AuthTokenProvider) {
    private val client = HttpClient {
        install(ContentNegotiation) { json() }
        install(Auth) {
            bearer {
                loadTokens { authProvider.getTokens() }
                refreshTokens { authProvider.refresh() }
            }
        }
        install(HttpTimeout) {
            connectTimeoutMillis = 10_000
            requestTimeoutMillis = 30_000
        }
        defaultRequest { url(baseUrl) }
    }

    suspend fun submitGpsBatch(points: List<GpsPoint>) = runCatching {
        client.post("/api/v1/m13/gps/batch") {
            contentType(ContentType.Application.Json)
            setBody(GpsBatchRequest(points))
        }
    }

    suspend fun submitPod(tripId: String, pod: PodData): PodResponse =
        client.post("/api/v1/m13/trips/$tripId/pod") {
            header("Idempotency-Key", uuid4().toString())
            contentType(ContentType.MultiPart.FormData)
            setBody(MultiPartFormDataContent(formData {
                append("signature", pod.signatureBytes)
                pod.photos.forEachIndexed { i, photo ->
                    append("photo_$i", photo)
                }
            }))
        }.body()
}
```

## SQLDelight local DB (offline-first)

```sql
-- shared/src/commonMain/sqldelight/com/ulp/db/Trip.sq
CREATE TABLE Trip (
    id TEXT NOT NULL PRIMARY KEY,
    tenantId TEXT NOT NULL,
    state TEXT NOT NULL,
    plannedStart INTEGER NOT NULL,
    syncStatus TEXT NOT NULL DEFAULT 'SYNCED'
);

selectAllForDriver:
SELECT * FROM Trip WHERE driverId = ? ORDER BY plannedStart DESC;

selectPendingSync:
SELECT * FROM Trip WHERE syncStatus = 'PENDING';

upsert:
INSERT OR REPLACE INTO Trip(id, tenantId, state, plannedStart, syncStatus)
VALUES (?, ?, ?, ?, ?);
```

## Platform-specific GPS (expect/actual)

```kotlin
// shared/src/commonMain/
expect class LocationProvider {
    suspend fun getCurrentLocation(): GpsPoint?
    fun watchLocation(intervalMs: Long): Flow<GpsPoint>
}

// shared/src/androidMain/
actual class LocationProvider(private val ctx: Context) {
    private val fused = LocationServices.getFusedLocationProviderClient(ctx)
    actual suspend fun getCurrentLocation(): GpsPoint? = ...
    actual fun watchLocation(intervalMs: Long): Flow<GpsPoint> = callbackFlow { ... }
}

// shared/src/iosMain/
actual class LocationProvider {
    private val mgr = CLLocationManager()
    actual suspend fun getCurrentLocation(): GpsPoint? = ...
    actual fun watchLocation(intervalMs: Long): Flow<GpsPoint> = ...
}
```

## Gotchas specific to ULP

1. **GPS battery management** - watch interval 30s when active, 60s when battery <20%. Stop watching when backgrounded for >15 min.
2. **Offline-first POD** - capture POD locally with SQLDelight, sync when network returns. Never block driver on network.
3. **Photo size** - compress JPEG to <500KB before upload. Quality 70.
4. **Idempotency-Key on every POST** - prevents duplicate POD submissions on retry.
5. **iOS background tasks** - register Background Location updates, but Apple may kill long-running tasks.
6. **Android foreground service required** for continuous GPS - shows persistent notification.
7. **Crashlytics + Sentry** - both, because Apple/Google tools are platform-specific.
8. **Build per env** - DEBUG, STAGING, PROD with different API URLs.

## ULP companion docs
- M13 driver app spec: `docs/ULP_LLD_M13_v1.0_Transportation.docx` Section 7 (POD), Section 12 (driver app)
