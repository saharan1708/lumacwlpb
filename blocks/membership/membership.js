export default async function decorate(block) {
  // Parse block content for authorable title
  const rows = Array.from(block.children);
  let title = 'BECOME A MEMBER';

  // Parse title from block content
  rows.forEach((row) => {
    const cols = Array.from(row.children);
    if (cols.length >= 2) {
      const key = cols[0].textContent.trim().toLowerCase();
      const value = cols[1].textContent.trim();
      
      if (key === 'title') {
        title = value;
      }
    }
  });

  // Build Adaptive Form definition for Membership
  const formDef = {
    id: 'membership-form',
    fieldType: 'form',
    appliedCssClassNames: 'membership-form',
    items: [
      {
        id: 'heading-membership',
        fieldType: 'heading',
        label: { value: title },
        appliedCssClassNames: 'membership-heading col-12',
      },
      {
        id: 'panel-main',
        name: 'main',
        fieldType: 'panel',
        appliedCssClassNames: 'membership-panel',
        items: [
          { 
            id: 'firstName', 
            name: 'firstName', 
            fieldType: 'text-input', 
            label: { value: 'First Name' }, 
            required: true, 
            properties: { colspan: 6 } 
          },
          { 
            id: 'lastName', 
            name: 'lastName', 
            fieldType: 'text-input', 
            label: { value: 'Last Name' }, 
            required: true, 
            properties: { colspan: 6 } 
          },
          { 
            id: 'email', 
            name: 'email', 
            fieldType: 'email', 
            label: { value: 'Email' }, 
            required: true, 
            properties: { colspan: 6 } 
          },
          { 
            id: 'phone', 
            name: 'phone', 
            fieldType: 'text-input', 
            label: { value: 'Phone number' }, 
            required: true, 
            properties: { colspan: 6 } 
          },
          {
            id: 'submit',
            name: 'submit',
            fieldType: 'button',
            buttonType: 'submit',
            label: { value: 'JOIN' },
            appliedCssClassNames: 'submit-wrapper col-12',
          },
        ],
      },
    ],
  };

  // Create a child form block that reuses the existing form renderer
  const formContainer = document.createElement('div');
  formContainer.className = 'form membership';

  const pre = document.createElement('pre');
  const code = document.createElement('code');
  code.textContent = JSON.stringify(formDef);
  pre.append(code);
  formContainer.append(pre);
  block.replaceChildren(formContainer);

  const formModule = await import('../form/form.js');
  await formModule.default(formContainer);
}

