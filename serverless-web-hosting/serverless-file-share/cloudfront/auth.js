function handler(event) {
  var request = event.request;
  // If no JWT token, then generate HTTP redirect 401 response.
  if (!request.cookies['ID-TOKEN']) {
    return {
      statusCode: 401,
      statusDescription: 'Unauthorized',
    };
  }
  return request;
}
