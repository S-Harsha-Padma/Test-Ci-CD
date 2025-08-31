const got = require('got');
const { Core } = require('@adobe/aio-sdk');
const { errorResponse } = require('../../utils');
const { HTTP_BAD_REQUEST, HTTP_INTERNAL_ERROR } = require('../../../lib/http');

const getAccessToken = async (params) => {
  const logger = Core.Logger('ups-token', { level: params.LOG_LEVEL || 'info' });

  try {
    const url = `${params.SERVICE_DOMAIN}security/v1/oauth/token`;
    const response = await got.post(url, {
      form: {
        grant_type: 'client_credentials',
      },
      username: params.CLIENT_ID,
      password: params.CLIENT_SECRET,
      responseType: 'json',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });
    logger.info('Access Token fetched successfully');

    return response.body;
  } catch (error) {
    return errorResponse(HTTP_INTERNAL_ERROR, "Can't connect to the service.", logger);
  }
};

const validateAddress = async (params, accessToken) => {
  const logger = Core.Logger('ups-address-validation', { level: params.LOG_LEVEL || 'info' });
  try {
    const version = 'v2';
    const requestOption = params.REQUEST_OPTION;
    const queryParams = new URLSearchParams({
      regionalrequestindicator: 'false',
      maximumcandidatelistsize: '5',
    }).toString();

    const url = `${params.SERVICE_DOMAIN}api/addressvalidation/${version}/${requestOption}?${queryParams}`;

    if (!params.address) {
      logger.error('Missing address details:', params.address);
      return errorResponse(HTTP_BAD_REQUEST, 'Missing address details', logger);
    }

    const address = params.address;
    // Make API request to UPS
    const response = await got.post(url, {
      json: {
        XAVRequest: {
          AddressKeyFormat: {
            ConsigneeName: `${address.firstname} ${address.lastname}`,
            AddressLine: address.street_line,
            PoliticalDivision2: address.city,
            PoliticalDivision1: address.region_code,
            PostcodePrimaryLow: address.postcode,
            CountryCode: address.country_code,
          },
        },
      },
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      responseType: 'json',
    });

    logger.debug('Address validation response:', response.body);

    if (!response.body) {
      logger.debug("Can't validate address. Please try later.");
      return errorResponse(HTTP_INTERNAL_ERROR, "Can't validate address. Please try later.", logger);
    }

    return {
      statusCode: response.statusCode,
      body: {
        candidates: response.body.XAVResponse.Candidate,
        responseStatus: response.body.XAVResponse?.Response?.ResponseStatus || {},
      },
    };
  } catch (error) {
    if (error.response) {
      const statusCode = error.response?.statusCode || 500;

      // Handle specific 400 Bad Request error
      if (statusCode === HTTP_BAD_REQUEST) {
        logger.error('Bad Request - Invalid address:', error.response.body.response.errors);
        return errorResponse(HTTP_BAD_REQUEST, 'Invalid address. Please check the provided details.', logger);
      }

      logger.error(`UPS API Error (${statusCode}):`, error.response.body);
      return errorResponse(statusCode, "Something went wrong. Can't validate address. Please try later", logger);
    }
    return errorResponse(HTTP_INTERNAL_ERROR, "Can't validate address. Please try later.", logger);
  }
};

module.exports = { getAccessToken, validateAddress };
