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

/**
 * Get Usps Shipping Method
 * @param {object} params - params
 * @returns {Array} - return Usps shipping methods
 */
function getUspsShippingMethod(params) {
  const shippingMethods = [];
  // Do not show the tablerate(usps) shipping method if the package weight is greater than 1.1
  // Removing bestway method in each cases.
  shippingMethods.push({
    op: 'add',
    path: 'result',
    value: {
      method: 'bestway',
      remove: true,
    },
  });
  return shippingMethods;
}

module.exports = {
  getUspsShippingMethod,
};
