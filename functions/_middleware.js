// Redirection 301 : direct-achatdiscount.com (apex, sans www) → www.direct-achatdiscount.com
// Le domaine sans www redirige vers le www (canonique). Le chemin et la query sont conservés.
export async function onRequest(context) {
  const url = new URL(context.request.url);
  if (url.hostname === 'direct-achatdiscount.com') {
    url.hostname = 'www.direct-achatdiscount.com';
    url.protocol = 'https:';
    return Response.redirect(url.toString(), 301);
  }
  return context.next();
}
