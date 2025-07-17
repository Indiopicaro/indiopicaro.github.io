---
category: Hack The Box
tags:
  - eJPT
title: Machine Blocky
comments: "true"
image: /assets/img/machines/Blocky/blockybanner.jpeg
---

## Introducción
Blocky es una máquina de dificultad facil en Hack The Box que presenta múltiples servicios abiertos, incluyendo FTP, SSH, HTTP y un puerto inusual de Minecraft. La enumeración inicial reveló un sitio web WordPress desactualizado y un archivo Java en un plugin personalizado que contenía credenciales sensibles. Utilizando esta información, fue posible acceder vía SSH y escalar privilegios a root. En este writeup detallaré los pasos realizados desde la enumeración inicial hasta la obtención de la flag de root.

## Skills

- WordPress Enumeration
- Analyzing a jar file

## Enumeración
Para comenzar con la enumeración de la máquina Blocky, realicé un escaneo completo de puertos. me permitió identificar los puertos abiertos en el sistema, revelando que los puertos 21, 22, 80 y 25565 estaban accesibles. Esta información inicial fue clave para enfocar la exploración tanto en los servicios web como en posibles configuraciones del servicio FTP y del puerto específico de Minecraft.
```bash
❯ nmap -p- --open -sS --min-rate 5000 -vvv -n -Pn 10.10.10.37
Host discovery disabled (-Pn). All addresses will be marked 'up' and scan times may be slower.
Initiating SYN Stealth Scan at 11:11
Scanning 10.10.10.37 [65535 ports]
Discovered open port 80/tcp on 10.10.10.37
Discovered open port 22/tcp on 10.10.10.37
Discovered open port 21/tcp on 10.10.10.37
Discovered open port 25565/tcp on 10.10.10.37
Completed SYN Stealth Scan at 11:11, 26.60s elapsed (65535 total ports)
Nmap scan report for 10.10.10.37
Host is up, received user-set (0.18s latency).
Not shown: 65530 filtered tcp ports (no-response), 1 closed tcp port (reset)
Some closed ports may be reported as filtered due to --defeat-rst-ratelimit
PORT      STATE SERVICE   REASON
21/tcp    open  ftp       syn-ack ttl 63
22/tcp    open  ssh       syn-ack ttl 63
80/tcp    open  http      syn-ack ttl 63
25565/tcp open  minecraft syn-ack ttl 63

Read data files from: /usr/bin/../share/nmap
Nmap done: 1 IP address (1 host up) scanned in 26.83 seconds
           Raw packets sent: 131082 (5.768MB) | Rcvd: 22 (964B)
```

Luego de identificar los puertos abiertos, realicé un escaneo de servicios específicos para obtener más información sobre las versiones y configuraciones.
```bash
❯ nmap -sCV -p 21,22,80,25565 10.10.10.37
Nmap scan report for 10.10.10.37
Host is up (0.26s latency).

PORT   STATE    SERVICE   VERSION
21/tcp open     ftp       ProFTPD 1.3.5a
22/tcp open     ssh       OpenSSH 7.2p2 Ubuntu 4ubuntu2.2 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey: 
|   2048 d6:2b:99:b4:d5:e7:53:ce:2b:fc:b5:d7:9d:79:fb:a2 (RSA)
|   256 5d:7f:38:95:70:c9:be:ac:67:a0:1e:86:e7:97:84:03 (ECDSA)
|_  256 09:d5:c2:04:95:1a:90:ef:87:56:25:97:df:83:70:67 (ED25519)
80/tcp open     http      Apache httpd 2.4.18
|_http-server-header: Apache/2.4.18 (Ubuntu)
|_http-title: Did not follow redirect to http://blocky.htb
25565/tcp open  minecraft Minecraft 1.11.2 (Protocol: 127, Message: A Minecraft Server, Users: 0/20)
Service Info: Host: 127.0.1.1; OSs: Unix, Linux; CPE: cpe:/o:linux:linux_kernel

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 27.37 seconds
```

### Enumeración WEB
Dado que el escaneo reveló una redirección al dominio blocky.htb, lo añadí al archivo /etc/hosts para poder acceder correctamente desde el navegador y herramientas de enumeración. Para ello, utilicé el siguiente comando:
```bash
❯ echo "10.10.10.37 blocky.htb" >> /etc/hosts
```

Luego de configurar el dominio en /etc/hosts, ejecuté un análisis con whatweb para identificar las tecnologías empleadas en el servidor web:
```bash
❯ whatweb 10.10.10.37
http://10.10.10.37 [302 Found] Apache[2.4.18], Country[RESERVED][ZZ], HTTPServer[Ubuntu Linux][Apache/2.4.18 (Ubuntu)], IP[10.10.10.37], RedirectLocation[http://blocky.htb], Title[302 Found]
http://blocky.htb [200 OK] Apache[2.4.18], Country[RESERVED][ZZ], HTML5, HTTPServer[Ubuntu Linux][Apache/2.4.18 (Ubuntu)], IP[10.10.10.37], JQuery[1.12.4], MetaGenerator[WordPress 4.8], PoweredBy[WordPress,WordPress,], Script[text/javascript], Title[BlockyCraft &#8211; Under Construction!], UncommonHeaders[link], WordPress[4.8]
```
![1](/assets/img/machines/Blocky/1.jpeg)

Para continuar con la enumeración de contenido web, utilicé wfuzz para identificar rutas accesibles:
```bash
❯ wfuzz -c -w /usr/share/wordlists/dirb/common.txt --hc 403,404 http://blocky.htb/FUZZ
 /usr/lib/python3/dist-packages/wfuzz/__init__.py:34: UserWarning:Pycurl is not compiled against Openssl. Wfuzz might not work correctly when fuzzing SSL sites. Check Wfuzz's documentation for more information.
********************************************************
* Wfuzz 3.1.0 - The Web Fuzzer                         *
********************************************************

Target: http://blocky.htb/FUZZ
Total requests: 4614

=====================================================================
ID           Response   Lines    Word       Chars       Payload                                                                                         
=====================================================================

000000001:   200        313 L    3592 W     52224 Ch    "http://blocky.htb/"                                                                            
000002021:   301        0 L      0 W        0 Ch        "index.php"                                                                                     
000002145:   301        9 L      28 W       313 Ch      "javascript"                                                                                    
000002954:   301        9 L      28 W       313 Ch      "phpmyadmin"                                                                                    
000003003:   301        9 L      28 W       310 Ch      "plugins"                                                                                       
000004454:   301        9 L      28 W       307 Ch      "wiki"                                                                                          
000004495:   301        9 L      28 W       313 Ch      "wp-content"                                                                                    
000004485:   301        9 L      28 W       311 Ch      "wp-admin"                                                                                      
000004501:   301        9 L      28 W       314 Ch      "wp-includes"                                                                                   
000004568:   405        0 L      6 W        42 Ch       "xmlrpc.php"                                                                                    

Total time: 183.1364
Processed Requests: 4614
Filtered Requests: 4604
Requests/sec.: 25.19433
```

Buscando usuarios con rol de author en la web se encontró con el usuario NOTCH.
![2](/assets/img/machines/Blocky/2.jpeg)
## Analisis .jar
Al acceder a la ruta /plugins, identifiqué un archivo JavaScript llamado BlockyCore.jar, el cual descargué para su análisis. Esta clase de archivos puede contener información sensible como rutas internas, credenciales codificadas, o detalles sobre el backend que podrían ser útiles para avanzar en la intrusión.
![3](/assets/img/machines/Blocky/3.jpeg)

Después procedí a listar su contenido. El archivo contenía únicamente dos entradas: el manifiesto MANIFEST.MF y una clase compilada en Java llamada BlockyCore.class, ubicada dentro del paquete com.myfirstplugin. Esto sugiere que se trata de un plugin personalizado, potencialmente vulnerable o que podría contener información sensible como credenciales incrustadas.
```bash
❯ unzip -l BlockyCore.jar
Archive:  BlockyCore.jar
  Length      Date    Time    Name
---------  ---------- -----   ----
       25  2017-07-02 11:12   META-INF/MANIFEST.MF
      939  2017-07-02 11:11   com/myfirstplugin/BlockyCore.class
---------                     -------
      964                     2 files
```

Después de descomprimir el archivo BlockyCore.jar, utilicé javap -c para desensamblar la clase BlockyCore.class. En el resultado, se observan tres atributos: sqlHost, sqlUser y sqlPass, los cuales contienen credenciales embebidas en el código. En particular, se identificó que sqlUser es root y sqlPass es 8YsqfCTnvxAUeduzjNSXe22, lo que sugiere que estas credenciales podrían ser válidas para acceder al servicio MySQL o incluso para realizar un intento de acceso por SSH como el usuario root o alguno con privilegios similares.
```bash
❯ jar xf BlockyCore.jar
❯ javap -c com.myfirstplugin.BlockyCore
Compiled from "BlockyCore.java"
public class com.myfirstplugin.BlockyCore {
  public java.lang.String sqlHost;

  public java.lang.String sqlUser;

  public java.lang.String sqlPass;

  public com.myfirstplugin.BlockyCore();
    Code:
       0: aload_0
       1: invokespecial #12                 // Method java/lang/Object."<init>":()V
       4: aload_0
       5: ldc           #14                 // String localhost
       7: putfield      #16                 // Field sqlHost:Ljava/lang/String;
      10: aload_0
      11: ldc           #18                 // String root
      13: putfield      #20                 // Field sqlUser:Ljava/lang/String;
      16: aload_0
      17: ldc           #22                 // String 8YsqfCTnvxAUeduzjNSXe22
      19: putfield      #24                 // Field sqlPass:Ljava/lang/String;
      22: return

  public void onServerStart();
    Code:
       0: return

  public void onServerStop();
    Code:
       0: return

  public void onPlayerJoin();
    Code:
       0: aload_0
       1: ldc           #33                 // String TODO get username
       3: ldc           #35                 // String Welcome to the BlockyCraft!!!!!!!
       5: invokevirtual #37                 // Method sendMessage:(Ljava/lang/String;Ljava/lang/String;)V
       8: return

  public void sendMessage(java.lang.String, java.lang.String);
    Code:
       0: return
}
```

Con las credenciales descubiertas en el archivo BlockyCore.class, intenté acceder por SSH utilizando el usuario notch y la contraseña 8YsqfCTnvxAUeduzjNSXe22, lo que resultó en un acceso exitoso al sistema. Al ejecutar el comando id, confirmé que el usuario pertenece al grupo sudo, lo que indica que posee privilegios administrativos y permite escalar fácilmente a root mediante el uso de sudo.
```bash
❯ ssh notch@blocky.htb
notch@blocky.htb's password: 8YsqfCTnvxAUeduzjNSXe22
Welcome to Ubuntu 16.04.2 LTS (GNU/Linux 4.4.0-62-generic x86_64)

 * Documentation:  https://help.ubuntu.com
 * Management:     https://landscape.canonical.com
 * Support:        https://ubuntu.com/advantage

7 packages can be updated.
7 updates are security updates.


Last login: Fri Jul  8 07:16:08 2022 from 10.10.14.29
To run a command as administrator (user "root"), use "sudo <command>".
See "man sudo_root" for details.

notch@Blocky:~$ id
uid=1000(notch) gid=1000(notch) groups=1000(notch),4(adm),24(cdrom),27(sudo),30(dip),46(plugdev),110(lxd),115(lpadmin),116(sambashare)
```

### Captura flag usuario
```bash
notch@Blocky:~$ ls
minecraft  user.txt
notch@Blocky:~$ cat user.txt
797d0a1d8eaab16c970b27eca284b0f5
```

### Captura flag root
Al verificar que el usuario notch pertenece al grupo sudo, intenté escalar privilegios utilizando sudo su con la misma contraseña descubierta previamente. El acceso fue exitoso, lo que me permitió obtener una shell como root. Finalmente.
```bash
notch@Blocky:~$ sudo su
[sudo] password for notch: 8YsqfCTnvxAUeduzjNSXe22
root@Blocky:/home/notch# cd /root
root@Blocky:~# ls
root.txt
root@Blocky:~# cat root.txt 
e50ad0fd099caff8aee2b99fb53c09ac
```
