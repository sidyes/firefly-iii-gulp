"use strict";

var gulp = require("gulp");
var path = require("path");
var exec = require("child_process").exec;

var GulpSSH = require("gulp-ssh");
var Client = require("ssh2-sftp-client");
var sftp = new Client();

const dotenvPath = path.join(__dirname, "..", ".env");
require("dotenv").config({ path: dotenvPath });

const config = {
  host: process.env.SSH_HOST,
  username: process.env.SSH_USER,
  password: process.env.SSH_PW,
  port: process.env.SSH_PORT || 22,
  dbUser: process.env.DB_USER,
  dbPw: process.env.DB_PW,
  dbHost: process.env.DB_HOST || "localhost",
  dbName: process.env.DB_NAME,
  fireflyPath: process.env.FIREFLY_PATH,
  backupPath: process.env.BACKUP_PATH,
};

var gulpSSH = new GulpSSH({
  ignoreErrors: false,
  sshConfig: config,
});

const srcEnv = `${config.fireflyPath}/.env`;
const srcDatabase = `${config.fireflyPath}//storage/database`;
const srcUpload = `${config.fireflyPath}/storage/upload`;
const destSqlDump = `${config.fireflyPath}/storage/database/dump.sql`;

var folderName = "";

function createBackupFolder(cb) {
  const date = new Date();
  folderName = `${
    config.backupPath
  }/${date.getFullYear()}-${date.getMonth()}-${date.getDate()}--${date.getTime()}`;
  console.log("0) Creating backupg folder...");

  exec(`mkdir ${folderName}`, (err, stdout, stderr) => cb(err));
}

function createMySqlDump() {
  console.log("1) Creating SQL dump...");
  return gulpSSH.shell(
    `mysqldump -u ${config.dbUser} --password='${config.dbPw}' ${config.dbName} > ${destSqlDump}`
  );
}

function downloadBackup() {
  return sftp
    .connect(config)
    .then(() => {
      console.log("2) Downloading .env...");
      return sftp.get(srcEnv, `${folderName}/.env`);
    })
    .then((data) => {
      console.log(data);
      console.log("3) Downloading /storage/database...");
      return sftp.downloadDir(srcDatabase, `${folderName}/database`);
    })
    .then((data) => {
      console.log(data);
      console.log("4) Downloading /storage/upload...");
      return sftp.downloadDir(srcUpload, `${folderName}/upload`);
    })
    .then((data) => {
      console.log(data);
      console.log("5) Downloading /storage/upload...");
      return sftp.downloadDir(srcUpload, `${folderName}/upload`);
    })
    .then((data) => {
      console.log(data);
      console.log("6) Deleting SQL dump...");
      return sftp.delete(destSqlDump);
    })
    .then(() => {
      return sftp.end();
    })
    .catch(console.error);
}

gulp.task(
  "backup",
  gulp.series(createBackupFolder, createMySqlDump, downloadBackup)
);
