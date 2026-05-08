# Mobile Client Service Integration Guide

Bu doküman, farklı bir mobil uygulamanın `agentechauth` ekosistemindeki dört ana yüzeyi nasıl kullanması gerektiğini anlatır:

- Login / session yönetimi (`techauthapi`)
- Push notification cihaz kaydı ve test bildirimi (`techauthapi`)
- Team servisleri (`techauthapi`)
- Dosya yükleme/indirme (`fiload`)

Doküman özellikle mobil istemci bakış açısıyla yazılmıştır. En kritik konu olan **bildirime tıklayınca doğru sayfanın açılması** için payload sözleşmesi ve istemci tarafı yönlendirme yaklaşımı ayrıca açıklanmıştır.

## 1. Servis Haritası

### Auth + Team + Notification API

Production base URL:

```bash
API_BASE_URL="<https://api.agentechauth.com/api>"
```

### Fiload

Production base URL:

```bash
FILOAD_BASE_URL="<https://fiload.agentechauth.com>"
```

## 2. Temel Kimlik Doğrulama Modeli

Sistem iki parçalı bir doğrulama mantığı kullanır:

1. **Project API key**
    - Hangi project bağlamında çalıştığınızı belirler.
    - Login sırasında body içinde gönderilir.
    - Login sonrasında çoğu protected endpoint'te `x-api-key` header'ında gönderilir.
2. **Access token**
    - Login sonrası alınır.
    - Protected endpoint'lerde `Authorization: Bearer <token>` olarak gönderilir.

### Login sırasında önemli fark

`POST /api/auth/login` çağrısında `projectApiKey` body içindedir.

### Login sonrası önemli fark

`teams` ve `notifications` endpoint'lerinde hem aşağıdaki header'lar gerekir:

```bash
-H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \\
-H 'x-api-key: pk_865b8622f8644c1de83d546e99a924dd'
```

## 3. Önerilen Mobil Uygulama Akışı

Mobil istemci için önerilen temel akış şöyledir:

1. Kullanıcı email + password ile login olur.
2. Login cevabından `accessToken`, `refreshToken`, `expiresIn` alınır.
3. Session güvenli storage'a yazılır.
4. Uygulama açılır açılmaz notification izni istenir.
5. Push izin verildiyse Expo push token alınır.
6. Token backend'e kaydedilir.
7. Kullanıcı team verilerini çeker.
8. Gerekirse Fiload ile dosya yükler.
9. Push geldiğinde uygulama foreground ise UI içinde gösterilir.
10. Kullanıcı bildirime tıklarsa payload içindeki route bilgisine göre ilgili sayfa açılır.

## 4. Login Entegrasyonu

## 4.1 Login isteği

```bash
curl -X POST "$API_BASE_URL/auth/login" \\
  -H 'Content-Type: application/json' \\
  -d '{
    "email": "user@example.com",
    "password": "SecurePass123!",
    "projectApiKey": "YOUR_PROJECT_API_KEY"
  }'
```

Örnek başarılı cevap:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "user_uuid",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "avatar": null,
      "emailVerified": true
    },
    "tokens": {
      "accessToken": "jwt_access_token",
      "refreshToken": "jwt_refresh_token",
      "expiresIn": 900
    }
  }
}
```

## 4.2 Refresh token

`accessToken` kısa ömürlüdür. Mobil istemci `refreshToken` saklamalıdır.

```bash
curl -X POST "$API_BASE_URL/auth/refresh" \\
  -H 'Content-Type: application/json' \\
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN"
  }'
```

## 4.3 Logout

```bash
curl -X POST "$API_BASE_URL/auth/logout" \\
  -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \\
  -d '{
    "refreshToken": "YOUR_REFRESH_TOKEN"
  }'
```

## 4.4 Mobil istemci tarafında saklanması gerekenler

Minimum saklanacak alanlar:

- `accessToken`
- `refreshToken`
- `expiresIn`
- `user.id`
- `user.email`
- `projectApiKey`

Öneri:

- iOS için Keychain
- Android için Encrypted Shared Preferences / secure storage
- Expo tarafında `SecureStore` veya mevcut güvenli storage çözümü

## 5. Notification Entegrasyonu

Notification tarafında backend'in sunduğu mevcut endpoint'ler şunlardır:

- `GET /api/notifications/devices`
- `POST /api/notifications/devices/register`
- `POST /api/notifications/devices/unregister`
- `POST /api/notifications/test`

Bu endpoint'ler **authenticated** çalışır.

## 5.1 Notification izni ne zaman istenmeli?

Önerilen yaklaşım:

- Uygulama açılışında veya login sonrası ilk uygun anda istenmeli
- Kullanıcı login olduktan sonra cihaz token'ı otomatik register edilmeli
- Kullanıcı izin vermezse uygulama çalışmaya devam etmeli, ama push özellikleri pasif kalmalı

## 5.2 Cihaz kaydı

Mobil istemci Expo push token ürettikten sonra backend'e kaydetmelidir.

```bash
curl -X POST "$API_BASE_URL/notifications/devices/register" \\
  -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \\
  -H 'x-api-key: YOUR_PROJECT_API_KEY' \\
  -d '{
    "expoPushToken": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
    "platform": "android",
    "deviceId": "optional-device-id",
    "deviceName": "Pixel 8 Pro",
    "appId": "com.example.yourmobileapp",
    "experienceId": "your-eas-project-id"
  }'
```

Örnek cevap:

```json
{
  "success": true,
  "message": "Push device registered successfully",
  "data": {
    "id": "push_device_uuid",
    "expoPushToken": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]",
    "platform": "android",
    "deviceId": "optional-device-id",
    "deviceName": "Pixel 8 Pro",
    "appId": "com.example.yourmobileapp",
    "experienceId": "your-eas-project-id",
    "isActive": true,
    "lastRegisteredAt": "2026-05-08T10:00:00.000Z",
    "lastSentAt": null
  }
}
```

### Ne zaman register edilmeli?

Önerilen anlar:

- Login sonrası hemen
- Uygulama yeniden açıldığında session restore sonrası
- Push token değişirse
- Kullanıcı permission'ı yeniden verirse

## 5.3 Kayıtlı cihazları listeleme

```bash
curl -X GET "$API_BASE_URL/notifications/devices" \\
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \\
  -H 'x-api-key: YOUR_PROJECT_API_KEY'
```

Bu çağrı özellikle şu durumlarda faydalıdır:

- Cihaz gerçekten kayıt oldu mu kontrolü
- Debug ekranı
- Logout öncesi aktif token'ı tespit etmek

## 5.4 Cihaz kaydını kaldırma

Logout sırasında tavsiye edilir.

```bash
curl -X POST "$API_BASE_URL/notifications/devices/unregister" \\
  -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \\
  -H 'x-api-key: YOUR_PROJECT_API_KEY' \\
  -d '{
    "expoPushToken": "ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]"
  }'
```

## 5.5 Test push gönderme

Mevcut backend endpoint'i, login olan kullanıcının **kendi aktif cihazlarına** test bildirimi yollar.

### En basit test örneği

```bash
curl -X POST "$API_BASE_URL/notifications/test" \\
  -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \\
  -H 'x-api-key: YOUR_PROJECT_API_KEY' \\
  -d '{
    "title": "Mobil test",
    "body": "Push akışı çalışıyor.",
    "data": {
      "screen": "notification-detail",
      "flow": "self-test",
      "target": "self"
    }
  }'
```

### Team detayına açılan test örneği

```bash
curl -X POST "$API_BASE_URL/notifications/test" \\
  -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \\
  -H 'x-api-key: YOUR_PROJECT_API_KEY' \\
  -d '{
    "title": "Team güncellemesi",
    "body": "Operations team ekranını aç.",
    "data": {
      "screen": "team-detail",
      "teamId": "team_uuid",
      "path": "/teams/team_uuid",
      "source": "manual-test"
    }
  }'
```

### Dosya detayına açılan test örneği

```bash
curl -X POST "$API_BASE_URL/notifications/test" \\
  -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \\
  -H 'x-api-key: YOUR_PROJECT_API_KEY' \\
  -d '{
    "title": "Yeni dosya hazır",
    "body": "Yüklenen dosyayı aç.",
    "data": {
      "screen": "file-detail",
      "filePath": "/uploads/2026/5/1746300000000-document.pdf",
      "path": "/files/detail?path=%2Fuploads%2F2026%2F5%2F1746300000000-document.pdf",
      "source": "manual-test"
    }
  }'
```

## 5.6 Bildirime tıklanınca sayfa açılması neden kritik ve nasıl yapılmalı?

Push bildirimi sadece bir mesaj değildir; aynı zamanda bir **navigasyon komutu** da taşımalıdır.

Backend şu an generic `data` alanı kabul eder:

```json
{
  "data": {
    "screen": "team-detail",
    "teamId": "team_uuid",
    "path": "/teams/team_uuid"
  }
}
```

Buradaki prensip şudur:

- `title` ve `body` kullanıcıya görünür metindir.
- `data` ise uygulamanın hangi ekranı açacağını söyler.

### Önerilen payload sözleşmesi

Mobil uygulamalar için aşağıdaki alanları standartlaştırmanız önerilir:

```json
{
  "screen": "team-detail",
  "path": "/teams/team_uuid",
  "entityId": "team_uuid",
  "entityType": "team",
  "deepLink": "yourapp://teams/team_uuid"
}
```

Önerilen alan anlamları:

- `screen`: Uygulama içi route adı
- `path`: Uygulama içi web-benzeri path
- `entityId`: Açılacak kaydın id'si
- `entityType`: Ne açılacağı (`team`, `notification`, `file`)
- `deepLink`: Native deep link gerekiyorsa kullanılacak adres

### İstemci tarafında önerilen karar sırası

Kullanıcı bildirime tıkladığında:

1. `deepLink` varsa onu çöz
2. yoksa `path` varsa route'a dönüştür
3. yoksa `screen` alanına göre fallback route aç
4. hiçbir şey yoksa `Notifications` veya `Inbox` ekranını aç

### Expo tabanlı istemci için örnek mantık

```tsx
Notifications.addNotificationResponseReceivedListener((response) => {
  const data = response.notification.request.content.data as Record<string, string | undefined>;

  if (data.deepLink) {
    router.push(data.deepLink);
    return;
  }

  if (data.path) {
    router.push(data.path);
    return;
  }

  switch (data.screen) {
    case 'team-detail':
      router.push(`/teams/${data.teamId}`);
      break;
    case 'file-detail':
      router.push(`/files/detail?path=${encodeURIComponent(data.filePath || '')}`);
      break;
    case 'notification-detail':
      router.push('/notifications/detail');
      break;
    default:
      router.push('/notifications');
  }
});
```

### Soğuk açılış senaryosu

Uygulama kapalıyken bildirime tıklanmış olabilir. Bu durumda uygulama açılır açılmaz son notification response kontrol edilmelidir.

Pseudo-flow:

```tsx
const lastResponse = await Notifications.getLastNotificationResponseAsync();
if (lastResponse?.notification) {
  handleNotificationOpen(lastResponse.notification.request.content.data);
}
```

Bu adım kritik olduğu için yalnızca listener eklemek yeterli değildir.

## 5.7 Production tavsiyesi

Şu an mevcut backend endpoint'i test/self-flow içindir. Gerçek ürün akışında genellikle ayrıca şunlar eklenir:

- belirli kullanıcıya bildirim gönderme
- team üyelerine toplu bildirim gönderme
- scheduled notification
- admin panel veya job queue üzerinden bildirim üretimi

Ama mobil istemci tarafında route açma mantığı değişmez; hep payload `data` alanı üzerinden ilerlemelidir.

## 6. Team API Entegrasyonu

Team endpoint'leri proje kapsamlıdır. Her çağrıda:

```bash
-H 'x-api-key: YOUR_PROJECT_API_KEY' \\
-H 'Authorization: Bearer YOUR_ACCESS_TOKEN'
```

header'ları birlikte kullanılmalıdır.

## 6.1 Team listeleme

```bash
curl -X GET "$API_BASE_URL/teams" \\
  -H 'x-api-key: YOUR_PROJECT_API_KEY' \\
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN'
```

## 6.2 Team oluşturma

Temel örnek:

```bash
curl -X POST "$API_BASE_URL/teams" \\
  -H 'Content-Type: application/json' \\
  -H 'x-api-key: YOUR_PROJECT_API_KEY' \\
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \\
  -d '{
    "name": "Operations",
    "slug": "operations",
    "description": "Core operational team"
  }'
```

## 6.3 Team detayı

```bash
curl -X GET "$API_BASE_URL/teams/team_uuid" \\
  -H 'x-api-key: YOUR_PROJECT_API_KEY' \\
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN'
```

## 6.4 Team güncelleme

```bash
curl -X PATCH "$API_BASE_URL/teams/team_uuid" \\
  -H 'Content-Type: application/json' \\
  -H 'x-api-key: YOUR_PROJECT_API_KEY' \\
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \\
  -d '{
    "name": "Operations Core",
    "slug": "operations-core",
    "description": "Updated scope",
    "isActive": true
  }'
```

## 6.5 Team üyeleri

### Üyeleri listeleme

```bash
curl -X GET "$API_BASE_URL/teams/team_uuid/members" \\
  -H 'x-api-key: YOUR_PROJECT_API_KEY' \\
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN'
```

### Eklenebilir kullanıcıları listeleme

```bash
curl -G "$API_BASE_URL/teams/team_uuid/available-users" \\
  -H 'x-api-key: YOUR_PROJECT_API_KEY' \\
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \\
  --data-urlencode 'q=john'
```

### Email ile üye ekleme

```bash
curl -X POST "$API_BASE_URL/teams/team_uuid/members" \\
  -H 'Content-Type: application/json' \\
  -H 'x-api-key: YOUR_PROJECT_API_KEY' \\
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \\
  -d '{
    "email": "member@acme.com",
    "role": "member"
  }'
```

### userId ile üye ekleme

```bash
curl -X POST "$API_BASE_URL/teams/team_uuid/members" \\
  -H 'Content-Type: application/json' \\
  -H 'x-api-key: YOUR_PROJECT_API_KEY' \\
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \\
  -d '{
    "userId": "user_uuid",
    "role": "admin"
  }'
```

### Üye rolü güncelleme

```bash
curl -X PATCH "$API_BASE_URL/teams/team_uuid/members/user_uuid" \\
  -H 'Content-Type: application/json' \\
  -H 'x-api-key: YOUR_PROJECT_API_KEY' \\
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \\
  -d '{
    "role": "admin"
  }'
```

### Üye kaldırma

```bash
curl -X DELETE "$API_BASE_URL/teams/team_uuid/members/user_uuid" \\
  -H 'x-api-key: YOUR_PROJECT_API_KEY' \\
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN'
```

## 6.6 Team logo için Fiload entegrasyonu

Takım logosu veya benzer bir medya yüklemek istiyorsanız önerilen akış:

1. Dosyayı önce Fiload'a yükleyin
2. Dönen `path` değerini alın
3. Team create/update isteğinde `logo` objesi olarak backend'e gönderin

Örnek Fiload upload:

```bash
curl -X POST "$FILOAD_BASE_URL/upld" \\
  -F "file=@/absolute/path/to/team-logo.png"
```

Örnek cevap:

```json
{
  "message": "File uploaded successfully",
  "filename": "1746300000000-team-logo.png",
  "path": "/uploads/2026/5/1746300000000-team-logo.png"
}
```

Sonra team update içinde bu path'i kullanın:

```bash
curl -X PATCH "$API_BASE_URL/teams/team_uuid" \\
  -H 'Content-Type: application/json' \\
  -H 'x-api-key: YOUR_PROJECT_API_KEY' \\
  -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \\
  -d '{
    "logo": {
      "path": "/uploads/2026/5/1746300000000-team-logo.png",
      "originalFileName": "team-logo.png",
      "mimeType": "image/png"
    }
  }'
```

## 7. Fiload Entegrasyonu

Fiload public ve basic-auth korumalı endpoint'ler sunar. Mobil istemci için çoğu durumda public yüzey yeterlidir.

## 7.1 Health check

```bash
curl -X GET "$FILOAD_BASE_URL/check"
```

Beklenen cevap:

```
OK
```

## 7.2 Public multipart upload

```bash
curl -X POST "$FILOAD_BASE_URL/upld" \\
  -F "file=@/absolute/path/to/document.pdf"
```

## 7.3 Public base64 upload

```bash
curl -X POST "$FILOAD_BASE_URL/upldbase64" \\
  -H 'Content-Type: application/json' \\
  -d '{
    "fileName": "hello.txt",
    "data": "SGVsbG8gRmlsb2FkIQ=="
  }'
```

## 7.4 İçerik önizleme

```bash
curl -G "$FILOAD_BASE_URL/gt" \\
  --data-urlencode 'path=/uploads/2026/5/1746300000000-document.pdf'
```

## 7.5 Dosya indirme

```bash
curl -L -G "$FILOAD_BASE_URL/dwnld" \\
  --data-urlencode 'path=/uploads/2026/5/1746300000000-document.pdf' \\
  -o downloaded-document.pdf
```

## 7.6 Mobil uygulamada Fiload kullanım önerileri

En yaygın mobil senaryolar:

- profil fotoğrafı yükleme
- team logo yükleme
- attachment yükleme
- yüklenen dosyanın path bilgisini kendi backend entity'nizde saklama

Önerilen istemci modeli:

1. Kullanıcı dosya seçer
2. Dosya Fiload'a yüklenir
3. Fiload `path` döner
4. Bu `path`, `techauthapi` içindeki ilgili kayda bağlanır
5. Listeleme ekranlarında bu `path` download URL'ine çevrilir

## 8. Hata Yönetimi Önerileri

## 8.1 Auth

- `400`: Eksik body alanları
- `401`: Hatalı email/parola veya token
- `403`: Yetkisiz erişim

## 8.2 Notifications

- `400`: Geçersiz payload veya eksik `expoPushToken`
- `401`: Access token eksik/geçersiz
- `404`: İlgili cihaz kaydı bulunamadı
- `500`: Expo gönderim veya sunucu hatası

## 8.3 Teams

- `400`: Validation hatası, son admin'i kaldırma girişimi
- `401`: Token yok/geçersiz
- `403`: Team yönetme yetkisi yok
- `404`: Team veya project bağlamı bulunamadı
- `409`: Aynı slug ile tekrar team oluşturma ya da mevcut üyeyi yeniden ekleme

## 8.4 Fiload

- `400`: Dosya/body eksik
- `401`: Basic auth gereken endpoint'te auth başarısız
- `404`: Dosya yolu bulunamadı
- `500`: Dosya sistemi veya servis tarafı hata

## 9. En Güçlü Referans Akış

Yeni bir mobil uygulama için en pratik entegrasyon akışı:

1. `POST /auth/login` ile session al
2. notification izni iste
3. `POST /notifications/devices/register` ile cihazı kaydet
4. `GET /teams` ile team listesini çek
5. dosya gerekiyorsa `POST /upld` ile Fiload'a yükle
6. yüklenen `path` değerini ilgili team/profile/entity update isteğinde kullan
7. test için `POST /notifications/test` ile route taşıyan payload gönder
8. bildirime tıklanınca `data.deepLink` / `data.path` / `data.screen` sırasıyla route çöz

## 10. Kritik Sonuç

Push bildiriminin bir sayfa açması backend tarafında sihirli olarak olmaz. Bunun çalışması için üç şey birlikte gerekir:

1. Backend bildirime doğru `data` payload'ını koymalı
2. Mobil istemci notification response listener kurmalı
3. Mobil istemci, cold start senaryosunda son notification response'u da ayrıca işlemeli

Bu üçlü doğru kurulursa:

- team bildirimi team detayını açar
- dosya bildirimi dosya detayını açar
- generic bildirim notification detail veya inbox ekranını açar