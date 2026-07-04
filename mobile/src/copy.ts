// Every funny line in the app lives here, so the tone stays consistent
// and can be argued about in one place.

export const copy = {
  appName: 'Old Shit',
  feedTitle: 'Old shit near you',
  feedSubtitle: 'History. It’s everywhere. Watch your step.',
  feedEmpty:
    'We looked around. Everything here is depressingly new. Try widening the radius.',
  feedLoading: 'Carbon-dating your surroundings…',

  locationDeniedTitle: 'No location? No problem.',
  locationDeniedBody:
    'Old shit is everywhere. Search for a place, or browse the greatest hits of human history.',
  locationErrorBody: 'Your GPS is being mysterious. Search instead.',
  greatestHitsButton: 'Show me the greatest hits',

  searchTitle: 'Find old shit',
  searchPlaceholder: 'Try “Rome”, “Stonehenge”, “castle”…',
  searchEmpty: 'Nothing found. Either it never existed or historians are hiding it.',
  searchHint: 'Type at least 2 characters and we’ll ransack the archives.',

  detailRatePrompt: 'Rate this old shit',
  detailYourPhotos: 'Photos from visitors',
  detailNoPhotos: 'No photos yet. Be the first to point a camera at it.',
  detailComments: 'Hot takes',
  detailNoComments: 'No comments yet. Surely you have opinions about very old things.',
  commentPlaceholder: 'Share your take. Historians are watching.',

  ticketOfficial: 'Book tickets to see this old shit',
  ticketSearch: 'Find tours nearby',

  badgeCurated: 'From our curators',
  badgeWikipedia: 'Straight from Wikipedia — blame them for the dry tone',

  authRequired: 'You need an account to have opinions here.',
  loginTitle: 'Welcome back',
  loginSubtitle: 'Your hot takes missed you.',
  registerTitle: 'Join Old Shit',
  registerSubtitle: 'Free entry. Unlike most of the sites in this app.',
  loginButton: 'Log in',
  registerButton: 'Sign up',
  logoutButton: 'Log out',

  uploadPhotoButton: 'Post a photo',
  uploadCaptionPlaceholder: 'Caption (optional, wit encouraged)',

  distance: (km: number) =>
    km < 1
      ? `${Math.round(km * 1000)} m away — basically touching it`
      : `${km.toFixed(1)} km between you and this old shit`,
};
