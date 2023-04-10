# Scripts for Firefly III

This repository contains useful scripts for the orchestration of a [firefly iii instance](https://www.firefly-iii.org/).
Feel free to use the gulp tasks for your personal application.

## Getting Started

1. Install via `yarn`
2. Create a `.env`file in the root of this repository with the following content:
  ```
    # SSH Connection Information
    SSH_HOST=<your server IP>
    SSH_USER=<SSH user>V
    SSH_PW=<SSH user password>
    SSH_PORT=<SSH port > # optional (default: 22)

    # DB Connection Information
    DB_USER=<database user>
    DB_PW=<database user password>
    DB_HOST=<host of DB> # optional (default: localhost)
    DB_NAME=<database name>

    # Custom Project Information=
    FIREFLY_PATH=<path to your firefly app> (e.g. /var/wwww/firefly-iii)
    BACKUP_PATH=<path to your local folder for backups> 
  ```

## Backup

`gulp backup`

Performs a [backup](https://docs.firefly-iii.org/firefly-iii/advanced-installation/backup/) of all relevant files of your firefly iii application as follows:

- Creates a new folder for your backup in XXX
- Copies `.env` of your firefly application
- Creates a SQL dump and moves it to `storage/database`
- Copies `/storage/database` and `storage/uploads` to the backup folder


## Restore

`gulp restore`

Restores files and database from [backup](#backup) at remote server:

- Selects desired backup to restore via prompt
- Copies `.env` to your firefly application
- Copies `database` folder to `/storage/database`
- Copies `upload` folder to `/storage/upload`
- Restores database
- Deletes database dump remotely

## Update Firefly III

TBD