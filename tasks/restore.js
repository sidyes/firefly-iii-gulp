"use strict";

var gulp = require("gulp");
var path = require("path");
var fs = require("fs");
var prompt = require("gulp-prompt");
var Client = require("ssh2-sftp-client");
var sftp = new Client();

var GulpSSH = require("gulp-ssh");

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

var backups = [];
var targetBackup = "";

function readBackups(cb) {
  console.log("0) Looking for existing backups...");
  backups = fs.readdirSync(config.backupPath);

  cb();
}

function chooseBackup() {
  console.log("1) Choosing a backup...");
  return gulp.src(".", { allowEmpty: true }).pipe(
    prompt.prompt(
      {
        type: "list",
        name: "name",
        message: "Which backup do you want to restore?",
        choices: backups,
      },
      function (res) {
        targetBackup = `${config.backupPath}/${res.name}`;
      }
    )
  );
}

function copyBackup() {
  return sftp
    .connect(config)
    .then(() => {
      console.log("2) Copying .env to remote...");
      return sftp.put(`${targetBackup}/.env`, `${config.fireflyPath}/.env`);
    })
    .then((data) => {
      console.log(data);
      console.log("2) Copying database to remote...");
      return sftp.uploadDir(
        `${targetBackup}/database`,
        `${config.fireflyPath}/storage/database`
      );
    })
    .then((data) => {
      console.log(data);
      console.log("3) Copying upload to remote...");
      return sftp.uploadDir(
        `${targetBackup}/upload`,
        `${config.fireflyPath}/storage/upload`
      );
    })
    .then((data) => {
      console.log(data);
      return sftp.end();
    })
    .catch((err) => {
      console.log(err, "catch error");
    });
}

function restoreDb() {
  console.log("4) Restoring database from SQL dump...");
  return gulpSSH.shell(
    `mysql -u ${config.dbUser} --password='${config.dbPw}' ${config.dbName} < ${config.fireflyPath}/storage/database/dump.sql`
  );
}

function deleteDump() {
  return sftp
    .connect(config)
    .then(() => {
      console.log("5) Deleting remote SQL dump...");
      return sftp.delete(`${config.fireflyPath}/storage/database/dump.sql`);
    })
    .then(() => {
      return sftp.end();
    })
    .catch((err) => {
      console.log(err, "catch error");
    });
}

gulp.task(
  "restore",
  gulp.series(readBackups, chooseBackup, copyBackup, restoreDb, deleteDump)
);
