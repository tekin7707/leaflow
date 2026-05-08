## Provit bir task yönetim uygulamasıdır.

Bir görev oluşturma - atama - gerçekleştirme - ispat - onay sistemi olacak.  Proje ismi provit.

3 temel uygulamadan oluşur

1-   Backend
    Temel api görevlerini yerine getirir. nodejs ile kodlanır. postgreeSql ile çalışır.
2-   Web uygulaması
    Yönetim paneli ve süreç yönetimi-uygulaması olarak temelde 2 bölümdür.
    - Yönetim paneli, genel olarak tanımlar yapılır, görevler oluşturulur, takımlara atanır. Diğer yönetimsel işlemleri içerir. Analiz sonuçlarını içerir.
    - Süreç yönetimi, sürecin izlenmesi ve/veya direkt uygulanması için kullanılır.

    React typescript ile kodlanır.

3-   Mobil uygulama
    Görevlerin yerine getirilmesi amacıyla kullanılır. Bunun yanında webde yapılan her işin minimal olarak yapılabilmesi gerekir. Görev oluşturma, atama gibi.

    Expo Typescript ile geliştirilecek.


## Dış Modüller
1-  Login 
    Login modülü dış servis kullanılarak yapılacak. Her türlü kullanıcı işlemleri, takım oluşturma servisleri hazır kullanılacak. (Agentechauth)

2-  Notification
    bildirim modülü api olarak dış servis kullanılacak. Bildirim gönderme, Bildirimleri listeleme, loglama hepsi burada sağlanacak. (Notifit)

3-  File Storage 
    ek dosyalar bu projenin temel dayanağı olacağı için fiload servisi kullanılacak. upload ve load olarak iki temel servisi olacak. uploada sana bir dosya ismi verecek. bu dosyanın hangi kayıtla ilişkili olduğunu tutmak bu projenin görevi. 


Burada daha çok akış yönetilecek.

## Flow
1) Kullanıcı bir takım oluşturur. Kullanıcılar dış servisten alınır. Takım dış serviste tutulur. Burada beklenen dış servisler kullanılarak bir takım oluşturulması, bu takımın kendi içinde üyelerine yönetici ve düz kullanıcı olarak rol verilmesi.
2) Checklist geliştirmesi. Soru grubu ve soruları olarak ayırabiliriz. Kullanıcı bir soru grubu oluşturur. Sonra bu soru grubuna ait soruları oluşturur. Her sorunun bir ağırlığı vardır. 1-2-3-4-5 olarak. 
3) Kullanıcı Bir TaskGroup oluşturur.
 - Bir task group alt tasklar içeriri. En azından bir tane. Bu taskgroup için dosya yüklenebilir, bitişinde yönetici onayı isteyebilir, başlangıç ve bitiş tarihleri eklenebilir, bir checklist doldurulması gerekebilir. Dosya yükleme için seçim gerekmez. Standarttır. Ama dosya yükleme şartı ya da min dosya adeti şartı koyabilir. Ya da sadece dış kabuktur. İçindeki taskların seçimleriyle anlam kazanır. Bunlar oluşturulma aşamasında değerlendirilir. 
4) Taskların belirlenmesi. Bir taskgroupa bağlı tasklar oluşturulur.
 - Her bir taskın sırası, diğer tasklarla ilişkisi (1. sıra bitmeden bu task yapılamaz gibi), min dosya adeti (0 ise opsiyoneldir), task ile ilgili hangi checklist gerekiyor, yönetici onayı gerekiyor mu, bitiş zamanı(taskın başlaması ile bağlantılı olarak) taskın öngörülen tamamlanma süresi
5) En önelisi bu taskgrup hangi takım tarafından yürütülecek bunun için atama yapılır. Başlangıç-bitiş tarihleri belirlenir. Sonundaki yönetici onayı ezilebilir.
6)Her aşamada notifikasyon sağlanmalıdır. Bunu mobil bildirimler olarak düşünelim. Hazır api tarafından sağlanacak.
7)Akış hem wem tarafında rahatça izlenebilmeli hem de mobil tarafta rahat şekilde uygulanabilmeli-izlenebilmelidir.
8) Açık renler ağırlıklı alışılmış tasarımların dışında güzel bir tasarım bekliyorum.
9) Uygulama bünyesinde db olarak postgreeSql kullanılacak. expo notifikasyon, mobil geliştirme expo ile yapılacak, web react, be ise nodejs olacak. Tüm yapıyı kur.

3 farklı klasör olacak diye düşünüyorum. 3'ü de paralel olarak geliştirilecek. Mock data ve mock servislerle çalış. dış servisler için gereksinimleri belir.

Claude Design bir çalışma yaptı. Aşağıda ilgili çalışma var.
Fetch this design file, read its readme, and implement the relevant aspects of the design. https://api.anthropic.com/v1/design/h/VMz1M2zesvpLGwNw5ZKU2Q?open_file=Provit+Design.html
Implement: Provit Design.html