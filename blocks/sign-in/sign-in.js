import { isAuthorEnvironment } from '../../scripts/scripts.js';

export default async function decorate(block) {
  const isAuthor = isAuthorEnvironment();
  
  // Build Adaptive Form definition for Sign In
  const formDef = {
    id: 'sign-in',
    fieldType: 'form',
    appliedCssClassNames: 'sign-in-form',
    items: [
      {
        id: 'heading-sign-in',
        fieldType: 'heading',
        label: { value: 'Sign in to your account' },
        appliedCssClassNames: 'col-12',
      },
      {
        id: 'panel-main',
        name: 'main',
        fieldType: 'panel',
        items: [
          {
            id: 'email',
            name: 'email',
            fieldType: 'email',
            label: { value: 'Email address' },
            required: true,
            properties: { colspan: 12 },
          },
          {
            id: 'password',
            name: 'password',
            fieldType: 'text-input',
            label: { value: 'Password' },
            required: true,
            properties: { colspan: 12 },
            format: 'password',
          },
          {
            id: 'submit',
            name: 'submit',
            fieldType: 'button',
            buttonType: 'submit',
            label: { value: 'SIGN IN' },
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

  // Add "Create account" link after form is rendered
  addCreateAccountLink(block, isAuthor);
}

function addCreateAccountLink(block, isAuthor) {
  // Wait for form to be rendered
  setTimeout(() => {
    const formElement = block.querySelector('form');
    if (!formElement) return;

    // Create "Create account" link section
    const linkSection = document.createElement('div');
    linkSection.className = 'sign-in-links';

    // Forgot password link
    const forgotPassword = document.createElement('a');
    forgotPassword.href = '#';
    forgotPassword.className = 'forgot-password-link';
    forgotPassword.textContent = 'Forgot your password?';
    forgotPassword.addEventListener('click', (e) => {
      e.preventDefault();
      // eslint-disable-next-line no-console
      console.log('Forgot password clicked');
      // TODO: Implement forgot password functionality
    });

    // Divider
    const divider = document.createElement('div');
    divider.className = 'sign-in-divider';
    divider.innerHTML = '<span>or</span>';

    // Create account link with smart path construction
    const createAccountLink = document.createElement('a');
    createAccountLink.className = 'create-account-link';
    createAccountLink.textContent = 'Create an account';
    
    // Smart path construction
    const currentPath = window.location.pathname;
    let registrationPath;
    
    if (isAuthor) {
      // For author, replace 'sign-in.html' with 'registration.html'
      registrationPath = currentPath.replace('/sign-in.html', '/registration.html');
    } else {
      // For EDS publish, replace '/sign-in' with '/registration'
      registrationPath = currentPath.replace(/\/sign-in(\.html)?$/, '/registration');
    }
    
    createAccountLink.href = registrationPath;

    linkSection.append(forgotPassword, divider, createAccountLink);
    formElement.parentElement.append(linkSection);
  }, 100);
}

