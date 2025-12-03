export default async function decorate(block) {
  // Build Adaptive Form definition for User Registration
  const formDef = {
    id: 'user-registration',
    fieldType: 'form',
    appliedCssClassNames: 'user-registration-form',
    items: [
      {
        id: 'heading-create-account',
        fieldType: 'heading',
        label: { value: 'Create an account' },
        appliedCssClassNames: 'col-12',
      },
      {
        id: 'panel-main',
        name: 'main',
        fieldType: 'panel',
        items: [
          { id: 'firstName', name: 'firstName', fieldType: 'text-input', label: { value: 'First name' }, required: true, properties: { colspan: 6 } },
          { id: 'lastName', name: 'lastName', fieldType: 'text-input', label: { value: 'Last name' }, required: true, properties: { colspan: 6 } },
          { id: 'email', name: 'email', fieldType: 'email', label: { value: 'Email address' }, required: true, properties: { colspan: 6 } },
          { id: 'phone', name: 'phone', fieldType: 'text-input', label: { value: 'Phone number' }, properties: { colspan: 6 } },
          { id: 'address', name: 'address', fieldType: 'text-input', label: { value: 'Address' }, properties: { colspan: 12 } },
          { id: 'zip', name: 'zip', fieldType: 'text-input', label: { value: 'ZIP code' }, properties: { colspan: 6 } },
          { id: 'city', name: 'city', fieldType: 'text-input', label: { value: 'City' }, properties: { colspan: 6 } },
          {
            id: 'gender',
            name: 'gender',
            fieldType: 'drop-down',
            label: { value: 'Gender' },
            enum: ['Female', 'Male', 'Other', 'Prefer not to say'],
            enumNames: ['Female', 'Male', 'Other', 'Prefer not to say'],
            type: 'string',
            properties: { colspan: 6 },
          },
          {
            id: 'dob-mmdd',
            name: 'dob',
            fieldType: 'text-input',
            label: { value: 'Birth day and month (MM-DD)' },
            placeholder: 'MM-DD',
            pattern: '^(0[1-9]|1[0-2])-(0[1-9]|[12][0-9]|3[01])$',
            properties: { colspan: 6 },
          },
          {
            id: 'loyalty',
            name: 'loyalty',
            fieldType: 'checkbox',
            label: { value: 'I want to join loyalty program' },
            enum: ['true'],
            type: 'string',
            properties: { variant: 'switch', alignment: 'horizontal', colspan: 12 },
          },
          {
            id: 'comm-prefs',
            name: 'commPrefs',
            fieldType: 'checkbox-group',
            label: { value: 'Communication preferences' },
            enum: ['email', 'phone', 'sms'],
            enumNames: ['Email', 'Phone', 'SMS'],
            type: 'array',
            appliedCssClassNames: 'horizontal col-12',
          },
          {
            id: 'heading-better',
            fieldType: 'heading',
            label: { value: 'LET US KNOW YOU BETTER' },
            appliedCssClassNames: 'col-12',
          },
          {
            id: 'shoe-size',
            name: 'shoeSize',
            fieldType: 'drop-down',
            label: { value: 'Shoe size' },
            enum: ['5', '6', '7', '8', '9', '10', '11', '12', '13'],
            type: 'string',
            properties: { colspan: 6 },
          },
          {
            id: 'shirt-size',
            name: 'shirtSize',
            fieldType: 'drop-down',
            label: { value: 'Shirt size' },
            enum: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
            type: 'string',
            properties: { colspan: 6 },
          },
          {
            id: 'favorite-color',
            name: 'favoriteColor',
            fieldType: 'drop-down',
            label: { value: 'Favorite color' },
            enum: ['Black', 'Blue', 'Brown', 'Green', 'Grey', 'Orange', 'Pink', 'Purple', 'Red', 'White', 'Yellow'],
            type: 'string',
            properties: { colspan: 12 },
          },
          {
            id: 'submit',
            name: 'submit',
            fieldType: 'button',
            buttonType: 'submit',
            label: { value: 'SUBMIT' },
            appliedCssClassNames: 'submit-wrapper col-12',
          },
        ],
      },
    ],
  };

  // Create a child form block that reuses the existing form renderer
  const formContainer = document.createElement('div');
  formContainer.className = 'form';

  const pre = document.createElement('pre');
  const code = document.createElement('code');
  code.textContent = JSON.stringify(formDef);
  pre.append(code);
  formContainer.append(pre);
  block.replaceChildren(formContainer);

  const formModule = await import('../form/form.js');
  await formModule.default(formContainer);

  // Wait for form to be fully rendered before attaching listeners
  setTimeout(() => {
    attachDataLayerUpdaters(block);
    prePopulateFormFromDataLayer(block);
  }, 100);
}

/**
 * Pre-populates form fields from existing dataLayer values
 * @param {HTMLElement} block - The user registration block
 */
function prePopulateFormFromDataLayer(block) {
  if (!window.dataLayer) return;

  const form = block.querySelector('form');
  if (!form) return;

  const dataLayer = window.dataLayer;

  // Helper function to safely get nested property
  const getNestedProperty = (obj, path) => {
    return path.split('.').reduce((current, prop) => current?.[prop], obj);
  };

  // Populate each field from dataLayer
  Object.keys(fieldToDataLayerMap).forEach((fieldName) => {
    const dataLayerPath = fieldToDataLayerMap[fieldName];
    const value = getNestedProperty(dataLayer, dataLayerPath);

    if (value !== undefined && value !== null && value !== '') {
      const field = form.querySelector(`[name="${fieldName}"]`);
      if (!field) return;

      if (field.type === 'checkbox') {
        if (fieldName === 'loyalty') {
          field.checked = value === true || value === 'true';
        } else {
          field.checked = true;
        }
      } else if (field.tagName.toLowerCase() === 'select') {
        field.value = value;
      } else {
        field.value = value;
      }
    }
  });

  // Pre-populate communication preferences
  if (dataLayer.marketing) {
    const commPrefsCheckboxes = form.querySelectorAll('input[name="commPrefs"]');
    commPrefsCheckboxes.forEach((checkbox) => {
      const prefType = checkbox.value; // 'email', 'phone', 'sms'
      if (prefType === 'email' && dataLayer.marketing.email?.val) {
        checkbox.checked = true;
      } else if (prefType === 'phone' && dataLayer.marketing.call?.val) {
        checkbox.checked = true;
      } else if (prefType === 'sms' && dataLayer.marketing.sms?.val) {
        checkbox.checked = true;
      }
    });
  }
}

/**
 * Maps form field names to dataLayer paths
 */
const fieldToDataLayerMap = {
  firstName: 'name.firstName',
  lastName: 'name.lastName',
  email: 'personalEmail.address',
  phone: 'mobilePhone.number',
  address: 'homeAddress.street1',
  zip: 'homeAddress.postalCode',
  city: 'homeAddress.city',
  gender: 'person.gender',
  dob: 'person.birthDayAndMonth',
  loyalty: 'person.loyaltyConsent',
  shoeSize: 'individualCharacteristics.shoeSize',
  shirtSize: 'individualCharacteristics.shirtSize',
  favoriteColor: 'individualCharacteristics.favoriteColor',
};

/**
 * Updates dataLayer with field value
 * @param {string} fieldName - Form field name
 * @param {*} value - Field value
 */
function updateDataLayerField(fieldName, value) {
  if (!window.updateDataLayer) {
    console.warn('DataLayer not available yet');
    return;
  }

  const dataLayerPath = fieldToDataLayerMap[fieldName];
  if (!dataLayerPath) {
    // Handle communication preferences separately
    if (fieldName === 'commPrefs') {
      updateCommunicationPreferences(value);
      return;
    }
    return;
  }

  // Build the nested object structure
  const pathParts = dataLayerPath.split('.');
  const updateObj = {};
  let current = updateObj;

  for (let i = 0; i < pathParts.length - 1; i++) {
    current[pathParts[i]] = {};
    current = current[pathParts[i]];
  }

  // Convert loyalty checkbox to boolean
  if (fieldName === 'loyalty') {
    current[pathParts[pathParts.length - 1]] = value === 'true' || value === true || (Array.isArray(value) && value.includes('true'));
  } else {
    current[pathParts[pathParts.length - 1]] = value || '';
  }

  window.updateDataLayer(updateObj);
}

/**
 * Updates communication preferences in dataLayer
 * @param {Array} preferences - Array of selected preferences ['email', 'phone', 'sms']
 */
function updateCommunicationPreferences(preferences = []) {
  if (!window.updateDataLayer) return;

  const prefsArray = Array.isArray(preferences) ? preferences : [];
  
  window.updateDataLayer({
    marketing: {
      email: { val: prefsArray.includes('email') },
      call: { val: prefsArray.includes('phone') },
      sms: { val: prefsArray.includes('sms') },
    },
  });
}

/**
 * Attaches dataLayer updaters to all form fields
 * @param {HTMLElement} block - The user registration block
 */
function attachDataLayerUpdaters(block) {
  const form = block.querySelector('form');
  if (!form) {
    console.warn('Form not found in user registration block');
    return;
  }

  // Get all form fields (inputs, selects, textareas)
  const fields = form.querySelectorAll('input, select, textarea');

  fields.forEach((field) => {
    const fieldName = field.name || field.id;
    if (!fieldName) return;

    // Handle different field types
    if (field.type === 'checkbox' || field.type === 'radio') {
      // For checkboxes and radios, use change event
      field.addEventListener('change', () => {
        handleFieldUpdate(form, fieldName, field);
      });
    } else {
      // For text inputs, selects, etc., use blur event
      field.addEventListener('blur', () => {
        handleFieldUpdate(form, fieldName, field);
      });

      // Also update on change for dropdowns
      if (field.tagName.toLowerCase() === 'select') {
        field.addEventListener('change', () => {
          handleFieldUpdate(form, fieldName, field);
        });
      }
    }
  });

  // Handle checkbox groups (communication preferences)
  const commPrefsCheckboxes = form.querySelectorAll('input[name="commPrefs"]');
  if (commPrefsCheckboxes.length > 0) {
    commPrefsCheckboxes.forEach((checkbox) => {
      checkbox.addEventListener('change', () => {
        const selectedPrefs = Array.from(commPrefsCheckboxes)
          .filter((cb) => cb.checked)
          .map((cb) => cb.value);
        updateDataLayerField('commPrefs', selectedPrefs);
      });
    });
  }
}

/**
 * Handles field update and triggers dataLayer update
 * @param {HTMLFormElement} form - The form element
 * @param {string} fieldName - Field name
 * @param {HTMLElement} field - Field element
 */
function handleFieldUpdate(form, fieldName, field) {
  let value;

  if (field.type === 'checkbox') {
    // Handle checkbox groups (multiple checkboxes with same name)
    const checkboxes = form.querySelectorAll(`input[name="${fieldName}"]`);
    if (checkboxes.length > 1) {
      // Checkbox group
      value = Array.from(checkboxes)
        .filter((cb) => cb.checked)
        .map((cb) => cb.value);
    } else {
      // Single checkbox
      value = field.checked ? (field.value || 'true') : '';
    }
  } else if (field.type === 'radio') {
    // For radio buttons, only update if this one is checked
    if (field.checked) {
      value = field.value;
    } else {
      return; // Don't update if radio is not checked
    }
  } else {
    // Text, select, textarea
    value = field.value;
  }

  updateDataLayerField(fieldName, value);
}


