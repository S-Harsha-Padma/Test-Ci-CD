/*
Copyright 2025 Adobe. All rights reserved.
This file is licensed to you under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License. You may obtain a copy
of the License at http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software distributed under
the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
OF ANY KIND, either express or implied. See the License for the specific language
governing permissions and limitations under the License.
*/
const { Core } = require('@adobe/aio-sdk');
const { errorResponse } = require('../../utils');
const { HTTP_INTERNAL_ERROR, HTTP_OK, HTTP_BAD_REQUEST } = require('../../../lib/http');
const { updateInventory } = require('./update-inventory-service');
const SFTPClient = require('ssh2-sftp-client');
const path = require('path');

const EXPECTED_HEADERS = [
  'Program ID',
  'Item Code',
  'Description 1',
  'Description 2',
  'Obsolete',
  'Qty On Hand',
  'Committed Qty',
  'Qty Available',
];

/**
 * Inventory update
 *
 * @param {object} params the request parameters
 * @returns {object} the response
 */
async function main(params) {
  const logger = Core.Logger('inventory-update', { level: params.LOG_LEVEL || 'info' });
  try {
    logger.info('Starting inventory update process');

    const { SFTP_USERNAME, SFTP_PASSWORD, SFTP_HOST, FILE_NAME, SFTP_REMOTE_DIR } = params;

    if (!SFTP_USERNAME || !SFTP_PASSWORD || !SFTP_HOST || !FILE_NAME || !SFTP_REMOTE_DIR) {
      logger.error('Missing required SFTP parameters.');
      return errorResponse(HTTP_BAD_REQUEST, 'SFTP credentials and remote path missing.', logger);
    }
    const sftp = new SFTPClient();

    const config = {
      host: SFTP_HOST,
      port: 22,
      username: SFTP_USERNAME,
      password: SFTP_PASSWORD,
    };
    await sftp.connect(config);
    logger.info(`Connected to SFTP server at ${config.host}`);

    // Fetch the latest modified file
    const fileList = await sftp.list(SFTP_REMOTE_DIR);
    const matchingFiles = fileList
      .filter(
        (file) =>
          file.type === '-' && file.name.toLowerCase().endsWith('.csv') && (!FILE_NAME || file.name.includes(FILE_NAME))
      )
      .sort((a, b) => new Date(b.modifyTime) - new Date(a.modifyTime));

    if (matchingFiles.length === 0) {
      logger.error(`No files found in ${SFTP_REMOTE_DIR} matching ${FILE_NAME || '[any file]'}`);
      return errorResponse(HTTP_BAD_REQUEST, `No matching files found in ${SFTP_REMOTE_DIR}`, logger);
    }
    const latestFile = matchingFiles[0];
    const filePathToRead = path.posix.join(SFTP_REMOTE_DIR, latestFile.name);
    logger.info(`Reading file: ${latestFile.name}`);

    let csvData;
    const delimeter = ',';

    const fileBuffer = await sftp.get(filePathToRead);

    csvData = fileBuffer.toString('utf8').trim();
    if (csvData.includes('\\r\\n')) {
      csvData = csvData.replace(/\\r\\n/g, '\n');
    }

    const rows = csvData.split(/\r?\n/).filter((row) => row.trim() !== '');
    if (rows.length === 0) {
      logger.debug('File is empty.');
      return {
        statusCode: HTTP_OK,
        body: { success: false, message: 'File is empty.' },
      };
    }

    // Remove header row if present
    const firstRowCols = rows[0].split(delimeter).map((h) => h.trim());
    const isHeader = EXPECTED_HEADERS.every((expected, index) => firstRowCols[index] === expected);
    const dataRows = isHeader ? rows.slice(1) : rows;

    const inventoryData = dataRows
      .map((row) => {
        const columns = row.split(delimeter).map((c) => c.trim().replace(/^"|"$/g, ''));
        return {
          sku: columns[1]?.trim(), // 2nd column (index 1)
          qty: Number(columns[5]) || 0, // 6th column (index 5)
        };
      })
      .filter((item) => item.sku);

    if (inventoryData.length > 0) {
      return updateInventory(inventoryData, params, logger);
    }

    return {
      statusCode: HTTP_OK,
      body: { success: false, message: 'Inventory file contains no data.' },
    };
  } catch (error) {
    logger.error(`Unexpected error in inventory update process: ${error.message}`);
    return errorResponse(HTTP_INTERNAL_ERROR, `${error.message}`, logger);
  }
}

exports.main = main;
