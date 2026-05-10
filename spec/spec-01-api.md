## Leaflow api login, temas

Aşağıdaki servisleri de kullanarak yapıyı kurmaya başlayalım. Kullanıcı buradan login olsun. Eğer yönetici ise takım listesini görsün, üyeleri görsün, profil sayfasını görsün

Adım adım ilerleyelim. 

Bir önceki aşamada task ile ilgili yapıyı kurdun. Onları ayağa kaldıralım. db oluşsun.

- aşağıdaki gibi login olunur
request
````curl

curl 'https://api.agentechauth.com/api/auth/login' \
  -H 'Accept: */*' \
  -H 'Accept-Language: tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7' \
  -H 'Connection: keep-alive' \
  -H 'Content-Type: application/json' \
  -H 'Origin: https://poc.agentechauth.com' \
  -H 'Referer: https://poc.agentechauth.com/' \
  -H 'Sec-Fetch-Dest: empty' \
  -H 'Sec-Fetch-Mode: cors' \
  -H 'Sec-Fetch-Site: same-site' \
  -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36' \
  -H 'sec-ch-ua: "Chromium";v="146", "Not-A.Brand";v="24", "Google Chrome";v="146"' \
  -H 'sec-ch-ua-mobile: ?0' \
  -H 'sec-ch-ua-platform: "macOS"' \
  -H 'x-api-key: pk_865b8622f8644c1de83d546e99a924dd' \
  --data-raw $'{"email":"tekin7707@gmail.com","password":"Mt777777\u0021."}'

````

response

````json
{
    "success": true,
    "data": {
        "user": {
            "id": "777abe7f-39b2-4577-abf3-a52edf053612",
            "email": "tekin7707@gmail.com",
            "firstName": "Mustafa",
            "lastName": "Tekin",
            "avatar": null,
            "emailVerified": true,
            "role": "admin",
            "isGlobalAdmin": false
        },
        "tokens": {
            "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI3NzdhYmU3Zi0zOWIyLTQ1NzctYWJmMy1hNTJlZGYwNTM2MTIiLCJlbWFpbCI6InRla2luNzcwN0BnbWFpbC5jb20iLCJpYXQiOjE3NzgwMDU5NDksImV4cCI6MTc3ODAwNjg0OX0.qBtGQGUnNwOqWRfij6cfQ_D1OMqUhlQ5drEsYQJyMws",
            "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI3NzdhYmU3Zi0zOWIyLTQ1NzctYWJmMy1hNTJlZGYwNTM2MTIiLCJpYXQiOjE3NzgwMDU5NDksImV4cCI6MTc3ODYxMDc0OX0.1WjHrq30ADhYFJlfh_fmYOA3L0vJRhZJil5htJWmPfA",
            "expiresIn": 900
        }
    }
}
````


- daha sonra istek aşağıdaki gibi yapılır. response ayrıca işine yarayacak bilgiler içeriyor. daha sonra ayrıntılı api dökümantasyonu vereceğim

request

````curl
curl 'https://api.agentechauth.com/api/projects/me' \
  -H 'Accept: */*' \
  -H 'Accept-Language: tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI3NzdhYmU3Zi0zOWIyLTQ1NzctYWJmMy1hNTJlZGYwNTM2MTIiLCJlbWFpbCI6InRla2luNzcwN0BnbWFpbC5jb20iLCJpYXQiOjE3NzgwMDU5NDksImV4cCI6MTc3ODAwNjg0OX0.qBtGQGUnNwOqWRfij6cfQ_D1OMqUhlQ5drEsYQJyMws' \
  -H 'Connection: keep-alive' \
  -H 'Content-Type: application/json' \
  -H 'Origin: https://poc.agentechauth.com' \
  -H 'Referer: https://poc.agentechauth.com/' \
  -H 'Sec-Fetch-Dest: empty' \
  -H 'Sec-Fetch-Mode: cors' \
  -H 'Sec-Fetch-Site: same-site' \
  -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36' \
  -H 'sec-ch-ua: "Chromium";v="146", "Not-A.Brand";v="24", "Google Chrome";v="146"' \
  -H 'sec-ch-ua-mobile: ?0' \
  -H 'sec-ch-ua-platform: "macOS"' \
  -H 'x-api-key: pk_865b8622f8644c1de83d546e99a924dd'
````


request

````curl
{
    "success": true,
    "data": {
        "project": {
            "id": "2b04d03d-250f-41c5-bf5e-bb472c579151",
            "name": "Tkn poc projeci",
            "slug": "mt-poc-project",
            "description": "Genel amaçlı poc projesidir.",
            "apiKey": "pk_865b8622f8644c1de83d546e99a924dd",
            "isActive": true,
            "allowedOrigins": [],
            "webhookUrl": null,
            "createdAt": "2026-05-02T13:12:46.725Z",
            "updatedAt": "2026-05-02T13:40:26.624Z"
        },
        "stats": {
            "userCount": 2,
            "adminCount": 1
        },
        "serviceSpec": {
            "consoleUrl": "https://poc.agentechauth.com",
            "apiBaseUrl": "https://api.agentechauth.com/api",
            "apiKey": "pk_865b8622f8644c1de83d546e99a924dd",
            "healthEndpoint": {
                "method": "GET",
                "url": "https://api.agentechauth.com/api/health",
                "description": "Backend erişimini, API gateway yönlendirmesini ve temel servis ayakta mı kontrolünü doğrular.",
                "curlExample": "curl -X GET 'https://api.agentechauth.com/api/health' -H 'x-api-key: pk_865b8622f8644c1de83d546e99a924dd'"
            },
            "headers": [
                {
                    "name": "x-api-key",
                    "value": "pk_865b8622f8644c1de83d546e99a924dd",
                    "description": "Her istekte proje bağlamını belirler. Public frontend konfigürasyonunda tutulabilir."
                },
                {
                    "name": "Authorization",
                    "value": "Bearer <accessToken>",
                    "description": "Login sonrası korumalı uçlarda zorunludur."
                }
            ],
            "authEndpoints": [
                {
                    "method": "POST",
                    "path": "/auth/login",
                    "description": "Email ve şifre ile giriş yapar."
                },
                {
                    "method": "POST",
                    "path": "/auth/resend-verification",
                    "description": "Aktivasyon emailini yeniden yollar."
                },
                {
                    "method": "POST",
                    "path": "/auth/forgot-password",
                    "description": "Şifre sıfırlama akışını başlatır."
                },
                {
                    "method": "POST",
                    "path": "/auth/refresh",
                    "description": "Refresh token ile yeni access token üretir."
                }
            ],
            "userEndpoints": [
                {
                    "method": "GET",
                    "path": "/projects/me",
                    "description": "Proje ayarları ve servis spesifikasyonunu getirir."
                },
                {
                    "method": "PATCH",
                    "path": "/projects/me",
                    "description": "Proje adı, slug, açıklama, allowed origins ve webhook bilgilerini günceller."
                },
                {
                    "method": "GET",
                    "path": "/projects/me/users",
                    "description": "Proje kullanıcı havuzunu listeler."
                },
                {
                    "method": "POST",
                    "path": "/projects/me/users",
                    "description": "Projeye yeni kullanıcı ekler ve aktivasyon/onboarding emaili yollar."
                },
                {
                    "method": "PATCH",
                    "path": "/projects/me/users/:userId",
                    "description": "Kullanıcı adı/soyadı veya rolünü günceller."
                },
                {
                    "method": "DELETE",
                    "path": "/projects/me/users/:userId",
                    "description": "Kullanıcıyı proje havuzundan kaldırır."
                },
                {
                    "method": "GET",
                    "path": "/teams",
                    "description": "Kullanıcının erişebildiği team kayıtlarını listeler."
                },
                {
                    "method": "POST",
                    "path": "/teams",
                    "description": "Yeni bir team oluşturur; oluşturan kullanıcı otomatik team admin olur."
                },
                {
                    "method": "GET",
                    "path": "/teams/:teamId/available-users",
                    "description": "İlgili team için henüz eklenmemiş aktif proje kullanıcılarını listeler."
                },
                {
                    "method": "GET",
                    "path": "/teams/:teamId/members",
                    "description": "Team üyelerini ve team içi rollerini listeler."
                },
                {
                    "method": "POST",
                    "path": "/teams/:teamId/members",
                    "description": "Team admin yetkisiyle yeni üye ekler."
                },
                {
                    "method": "PATCH",
                    "path": "/teams/:teamId/members/:userId",
                    "description": "Team içi rolü admin/member olarak günceller."
                },
                {
                    "method": "DELETE",
                    "path": "/teams/:teamId/members/:userId",
                    "description": "Üyeyi team içinden çıkarır."
                }
            ],
            "notes": [
                "API key her istekte zorunludur; access token ise sadece login sonrası korumalı uçlarda gönderilir.",
                "Yeni kullanıcılar için aktivasyon linki backend üzerindeki email doğrulama endpointine gider.",
                "Projede her zaman en az bir admin üyelik bırakılmalıdır; son admin kaldırılamaz veya düşürülemez.",
                "Team içinde en az bir team admin kalmalıdır; son team admin member rolüne düşürülemez veya silinemez."
            ]
        }
    }
}

````


team listesi

````curl
curl 'https://api.agentechauth.com/api/teams' \
  -H 'Accept: */*' \
  -H 'Accept-Language: tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI3NzdhYmU3Zi0zOWIyLTQ1NzctYWJmMy1hNTJlZGYwNTM2MTIiLCJlbWFpbCI6InRla2luNzcwN0BnbWFpbC5jb20iLCJpYXQiOjE3NzgwMDU5NDksImV4cCI6MTc3ODAwNjg0OX0.qBtGQGUnNwOqWRfij6cfQ_D1OMqUhlQ5drEsYQJyMws' \
  -H 'Connection: keep-alive' \
  -H 'Content-Type: application/json' \
  -H 'Origin: https://poc.agentechauth.com' \
  -H 'Referer: https://poc.agentechauth.com/' \
  -H 'Sec-Fetch-Dest: empty' \
  -H 'Sec-Fetch-Mode: cors' \
  -H 'Sec-Fetch-Site: same-site' \
  -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36' \
  -H 'sec-ch-ua: "Chromium";v="146", "Not-A.Brand";v="24", "Google Chrome";v="146"' \
  -H 'sec-ch-ua-mobile: ?0' \
  -H 'sec-ch-ua-platform: "macOS"' \
  -H 'x-api-key: pk_865b8622f8644c1de83d546e99a924dd'
````

````json
{
    "success": true,
    "data": [
        {
            "id": "3cb69dfa-54d2-4ef5-ba07-a37ae016bdd9",
            "name": "test team",
            "slug": "test-team",
            "description": null,
            "isActive": true,
            "createdAt": "2026-05-04T20:56:41.678Z",
            "updatedAt": "2026-05-05T12:36:33.297Z",
            "logo": {
                "path": "2026-05/7fafca18-5b53-4ed9-a381-269e04392167.jpg",
                "originalFileName": "rbk03.jpg",
                "mimeType": "image/jpeg"
            },
            "project": {
                "id": "2b04d03d-250f-41c5-bf5e-bb472c579151",
                "name": "Tkn poc projeci",
                "slug": "mt-poc-project"
            },
            "createdBy": {
                "id": "777abe7f-39b2-4577-abf3-a52edf053612",
                "email": "tekin7707@gmail.com",
                "firstName": "Mustafa",
                "lastName": "Tekin"
            },
            "membersCount": 2,
            "adminCount": 1,
            "currentUserRole": "admin",
            "canManage": true,
            "memberships": [
                {
                    "id": "625f3983-d987-4987-af20-14aa5219305b",
                    "role": "admin",
                    "user": {
                        "id": "777abe7f-39b2-4577-abf3-a52edf053612",
                        "email": "tekin7707@gmail.com",
                        "firstName": "Mustafa",
                        "lastName": "Tekin",
                        "isActive": true,
                        "isBanned": false
                    }
                },
                {
                    "id": "b616d568-4816-41d1-a57d-205f6e908ac3",
                    "role": "member",
                    "user": {
                        "id": "02f9e6fb-6fac-4d6b-ae36-4c7faefa81fe",
                        "email": "hukumsuren@gmail.com",
                        "firstName": "Hüküm",
                        "lastName": "Süren",
                        "isActive": true,
                        "isBanned": false
                    }
                }
            ]
        }
    ]
}
````


team members

````curl
curl 'https://api.agentechauth.com/api/teams/3cb69dfa-54d2-4ef5-ba07-a37ae016bdd9/members' \
  -H 'Accept: */*' \
  -H 'Accept-Language: tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7' \
  -H 'Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiI3NzdhYmU3Zi0zOWIyLTQ1NzctYWJmMy1hNTJlZGYwNTM2MTIiLCJlbWFpbCI6InRla2luNzcwN0BnbWFpbC5jb20iLCJpYXQiOjE3NzgwMDU5NDksImV4cCI6MTc3ODAwNjg0OX0.qBtGQGUnNwOqWRfij6cfQ_D1OMqUhlQ5drEsYQJyMws' \
  -H 'Connection: keep-alive' \
  -H 'Content-Type: application/json' \
  -H 'Origin: https://poc.agentechauth.com' \
  -H 'Referer: https://poc.agentechauth.com/' \
  -H 'Sec-Fetch-Dest: empty' \
  -H 'Sec-Fetch-Mode: cors' \
  -H 'Sec-Fetch-Site: same-site' \
  -H 'User-Agent: Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36' \
  -H 'sec-ch-ua: "Chromium";v="146", "Not-A.Brand";v="24", "Google Chrome";v="146"' \
  -H 'sec-ch-ua-mobile: ?0' \
  -H 'sec-ch-ua-platform: "macOS"' \
  -H 'x-api-key: pk_865b8622f8644c1de83d546e99a924dd'
````

````json
{
    "success": true,
    "data": [
        {
            "id": "625f3983-d987-4987-af20-14aa5219305b",
            "role": "admin",
            "createdAt": "2026-05-04T20:56:41.682Z",
            "updatedAt": "2026-05-04T20:56:41.682Z",
            "user": {
                "id": "777abe7f-39b2-4577-abf3-a52edf053612",
                "email": "tekin7707@gmail.com",
                "firstName": "Mustafa",
                "lastName": "Tekin",
                "isActive": true,
                "isBanned": false
            }
        },
        {
            "id": "b616d568-4816-41d1-a57d-205f6e908ac3",
            "role": "member",
            "createdAt": "2026-05-05T12:36:59.852Z",
            "updatedAt": "2026-05-05T12:36:59.852Z",
            "user": {
                "id": "02f9e6fb-6fac-4d6b-ae36-4c7faefa81fe",
                "email": "hukumsuren@gmail.com",
                "firstName": "Hüküm",
                "lastName": "Süren",
                "isActive": true,
                "isBanned": false
            }
        }
    ]
}
````


