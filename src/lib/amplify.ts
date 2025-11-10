import { Amplify } from 'aws-amplify';
import outputs from '../../amplify_outputs.json';

/**
 * Configure AWS Amplify for the application
 * This initializes Amplify with the backend configuration
 */
Amplify.configure(outputs);

export default Amplify;

