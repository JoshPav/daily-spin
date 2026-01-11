export const getUserId = () => {
  const userId = process.env.USER_ID;

  // TODO: Get from session once auth is set up
  if (!userId) {
    throw new Error('No userId');
  }

  return userId;
};
