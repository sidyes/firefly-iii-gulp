"use strict";

var gulp = require("gulp");
var path = require("path");

var GulpSSH = require("gulp-ssh");

const dotenvPath = path.join(__dirname, "..", ".env");
require("dotenv").config({ path: dotenvPath });

const config = {
  host: process.env.SSH_HOST,
  username: process.env.SSH_USER,
  password: process.env.SSH_PW,
  port: process.env.SSH_PORT || 22,
  fireflyPath: process.env.FIREFLY_PATH,
};

var gulpSSH = new GulpSSH({
  ignoreErrors: false,
  sshConfig: config,
});

// e.g. /var/www/firefly-iii -> firefly-iii
const appName = config.fireflyPath.substring(
  config.fireflyPath.lastIndexOf("/") + 1
);

// e.g. /var/www/firefly-iii -> /var/www
const rootDir = config.fireflyPath.substring(
  0,
  config.fireflyPath.lastIndexOf("/")
);

function deleteOldVersion() {
  console.log("0) Delete old firefly iii version/backup...");
  return gulpSSH
    .shell([`rm -r ${config.fireflyPath}-old`])
    .on("ssh2Data", (data) => console.dir(data.toString()));
}

function deleteOldImporterVersion() {
  console.log("0) Delete old firefly iii importer version/backup...");
  return gulpSSH
    .shell([`rm -r ${rootDir}/old-data-importer`])
    .on("ssh2Data", (data) => console.dir(data.toString()));
}

function installNewVersion() {
  console.log("1) Install new firefly iii version...");
  return gulpSSH
    .shell([
      'latestversion=$(curl -s https://api.github.com/repos/firefly-iii/firefly-iii/releases/latest  | grep -oP \'"tag_name": "K(.*)(?=")\')',
      "cd /var/www",
      `yes | composer create-project grumpydictator/firefly-iii --no-dev --prefer-dist ${appName}-updated $latestversion`,
      `cp ${appName}/.env ${appName}-updated/.env`,
      `cp ${appName}/storage/upload/* ${appName}-updated/storage/upload/`,
      `cp ${appName}/storage/export/* ${appName}-updated/storage/export/`,
      `cd ${appName}-updated`,
      `rm -rf bootstrap/cache/*`,
      `php artisan cache:clear`,
      `php artisan migrate --seed`,
      `php artisan firefly-iii:upgrade-database`,
      `php artisan passport:keys`,
      `php artisan cache:clear`,
    ])
    .on("ssh2Data", (data) => console.dir(data.toString()));
}

function serveNextVersion() {
  console.log("2) Run new firefly iii version...");
  return gulpSSH
    .shell([
      "cd /var/www",
      `mv ${appName} ${appName}-old`,
      `mv ${appName}-updated ${appName}`,
      "sleep 10",
      `cd ${appName}`,
      "php artisan cache:clear",
      "sleep 10",
      "cd ..",
      `chown -R www-data:www-data ${appName}`,
      "sleep 10",
      `chmod -R 775 ${appName}/storage`,
      "sleep 10",
      "service apache2 restart",
      "exit(0)",
    ])
    .on("ssh2Data", (data) => console.dir(data.toString()));
}

function upgradeDataImporter() {
  console.log("3) Install new firefly iii data-importer version...");

  return gulpSSH
    .shell([
      'latestversion=$(curl -s https://api.github.com/repos/firefly-iii/data-importer/releases/latest | grep -oP \'"tag_name": "K(.*)(?=")\')',
      "cd /var/www",
      `yes | composer create-project firefly-iii/data-importer --no-dev --prefer-dist updated-data-importer $latestversion`,
      `cp /var/www/data-importer/.env /var/www/updated-data-importer/.env`,
      `mv /var/www/data-importer /var/www/old-data-importer`,
      `mv /var/www/updated-data-importer /var/www/data-importer`,
      `sudo chown -R www-data:www-data data-importer`,
      `sudo chmod -R 775 data-importer/storage`,
    ])
    .on("ssh2Data", (data) => console.dir(data.toString()));
}

/** Gulp task upgrade */
gulp.task(
  "upgrade",
  gulp.series(deleteOldVersion, installNewVersion, serveNextVersion)
);
gulp.task(
  "upgrade-importer",
  gulp.series(deleteOldImporterVersion, upgradeDataImporter)
);
