# 🛠️ Infraestructura y Entorno Local

Este documento detalla la configuración del entorno local unificado para el proyecto **Campus Circular**.

## 🚀 Requisitos Previos
* Docker Desktop instalado (Versión AMD64 para sistemas estándar).
* WSL2 configurado (si trabajas en Windows).

## 📦 Componentes del Entorno (Docker)
El entorno local se gestiona mediante el archivo `docker-compose.yml` en la raíz del proyecto e incluye:

1. **MySQL Server (v8.0)**
   * **Contenedor:** `mysql-campus`
   * **Puerto expuesto:** `3306`
   * **Base de datos inicial:** `campus_circular_db` (Codificación `UTF8MB4` mediante `schema.sql`).
   * **Credenciales:** Usuario `root` | Contraseña `rootpassword`.

2. **MailHog (Servidor SMTP Simulado)**
   * **Contenedor:** `mailhog-campus`
   * **Puerto SMTP (Interno):** `1025`
   * **Interfaz Web (UI):** [http://localhost:8025](http://localhost:8025) (Para revisar los correos de verificación OTP).

## 🛠️ Comandos de Gestión del Entorno
Ejecutar siempre desde la raíz del repositorio:

* **Levantar servicios (Segundo plano):**  
  `docker compose up -d`
* **Verificar estado de los contenedores:**  
  `docker compose ps`
* **Apagar el entorno manteniendo los datos:**  
  `docker compose down`
* **Apagar el entorno limpiando la base de datos (Reset completo):**  
  `docker compose down -v`

