import axios from 'axios';
import CircuitBreaker from 'opossum';
const checkIsDisposableEmail = async (email: string) => {
  return new Promise(async (resolve, reject) => {
    try {
      const domain = email.split('@')[1];
      const response = await axios.get(
        `https://open.kickbox.com/v1/disposable/${domain}`,
      );
      resolve(response.data.disposable);
    } catch (err) {
      reject(err);
    }
  });
};

export const checkIsDisposableEmailWithCircuitBreaker = async (
  email: string,
) => {
  const breaker = new CircuitBreaker(checkIsDisposableEmail, {
    timeout: 5000,
    errorThresholdPercentage: 50,
    resetTimeout: 30000,
  });

  return new Promise(async (resolve, reject) => {
    try {
      const isDisposable = await breaker.fire(email);
      resolve(isDisposable);
    } catch (err) {
      reject(err);
    }
  });
};
