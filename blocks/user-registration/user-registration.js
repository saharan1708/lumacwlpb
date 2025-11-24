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
            appliedCssClassNames: 'horizontal col-12',
            items: [
              {
                id: 'pref-email',
                name: 'prefEmail',
                fieldType: 'checkbox',
                label: { value: 'Email' },
                enum: ['true'],
                type: 'string',
              },
              {
                id: 'pref-phone',
                name: 'prefPhone',
                fieldType: 'checkbox',
                label: { value: 'Phone' },
                enum: ['true'],
                type: 'string',
              },
              {
                id: 'pref-sms',
                name: 'prefSms',
                fieldType: 'checkbox',
                label: { value: 'SMS' },
                enum: ['true'],
                type: 'string',
              },
            ],
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
}


