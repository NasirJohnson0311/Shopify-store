import {useState} from 'react';
import {CUSTOMER_UPDATE_MUTATION} from '~/graphql/customer-account/CustomerUpdateMutation';
import {
  UPDATE_ADDRESS_MUTATION,
  DELETE_ADDRESS_MUTATION,
  CREATE_ADDRESS_MUTATION,
} from '~/graphql/customer-account/CustomerAddressMutations';
import {CUSTOMER_ORDERS_QUERY} from '~/graphql/customer-account/CustomerOrdersQuery';
import {
  data,
  Form,
  useActionData,
  useNavigation,
  useOutletContext,
  Link,
  useLoaderData,
} from 'react-router';
import {
  Money,
  getPaginationVariables,
  flattenConnection,
} from '@shopify/hydrogen';
import {
  buildOrderSearchQuery,
  parseOrderFilters,
} from '~/lib/orderFilters';
import {PaginatedResourceSection} from '~/components/PaginatedResourceSection';

/**
 * @type {Route.MetaFunction}
 */
export const meta = () => {
  return [{title: 'Profile'}];
};

/**
 * @param {Route.LoaderArgs}
 */
export async function loader({request, context}) {
  const {customerAccount} = context;

  context.customerAccount.handleAuthStatus();

  // Fetch orders data
  const paginationVariables = getPaginationVariables(request, {
    pageBy: 20,
  });

  const url = new URL(request.url);
  const filters = parseOrderFilters(url.searchParams);
  const query = buildOrderSearchQuery(filters);

  const {data: ordersData, errors} = await customerAccount.query(CUSTOMER_ORDERS_QUERY, {
    variables: {
      ...paginationVariables,
      query,
      language: customerAccount.i18n.language,
    },
  });

  if (errors?.length || !ordersData?.customer) {
    throw Error('Customer orders not found');
  }

  return {orders: ordersData.customer.orders, filters};
}

/**
 * @param {Route.ActionArgs}
 */
export async function action({request, context}) {
  const {customerAccount} = context;
  const form = await request.formData();

  // Check if this is an address operation
  const addressId = form.has('addressId')
    ? String(form.get('addressId'))
    : null;

  if (addressId) {
    // Handle address operations
    try {
      if (!addressId) {
        throw new Error('You must provide an address id.');
      }

      // this will ensure redirecting to login never happen for mutation
      const isLoggedIn = await customerAccount.isLoggedIn();
      if (!isLoggedIn) {
        return data(
          {error: {[addressId]: 'Unauthorized'}},
          {
            status: 401,
          },
        );
      }

      const defaultAddress = form.has('defaultAddress')
        ? String(form.get('defaultAddress')) === 'on'
        : false;
      const address = {};
      const keys = [
        'address1',
        'address2',
        'city',
        'company',
        'territoryCode',
        'firstName',
        'lastName',
        'phoneNumber',
        'zoneCode',
        'zip',
      ];

      for (const key of keys) {
        const value = form.get(key);
        if (typeof value === 'string') {
          address[key] = value;
        }
      }

      switch (request.method) {
        case 'POST': {
          // handle new address creation
          try {
            const {data, errors} = await customerAccount.mutate(
              CREATE_ADDRESS_MUTATION,
              {
                variables: {
                  address,
                  defaultAddress,
                  language: customerAccount.i18n.language,
                },
              },
            );

            if (errors?.length) {
              throw new Error(errors[0].message);
            }

            if (data?.customerAddressCreate?.userErrors?.length) {
              throw new Error(data?.customerAddressCreate?.userErrors[0].message);
            }

            if (!data?.customerAddressCreate?.customerAddress) {
              throw new Error('Customer address create failed.');
            }

            return {
              error: null,
              createdAddress: data?.customerAddressCreate?.customerAddress,
              defaultAddress,
            };
          } catch (error) {
            if (error instanceof Error) {
              return data(
                {error: {[addressId]: error.message}},
                {
                  status: 400,
                },
              );
            }
            return data(
              {error: {[addressId]: error}},
              {
                status: 400,
              },
            );
          }
        }

        case 'PUT': {
          // handle address updates
          try {
            const {data, errors} = await customerAccount.mutate(
              UPDATE_ADDRESS_MUTATION,
              {
                variables: {
                  address,
                  addressId: decodeURIComponent(addressId),
                  defaultAddress,
                  language: customerAccount.i18n.language,
                },
              },
            );

            if (errors?.length) {
              throw new Error(errors[0].message);
            }

            if (data?.customerAddressUpdate?.userErrors?.length) {
              throw new Error(data?.customerAddressUpdate?.userErrors[0].message);
            }

            if (!data?.customerAddressUpdate?.customerAddress) {
              throw new Error('Customer address update failed.');
            }

            return {
              error: null,
              updatedAddress: address,
              defaultAddress,
            };
          } catch (error) {
            if (error instanceof Error) {
              return data(
                {error: {[addressId]: error.message}},
                {
                  status: 400,
                },
              );
            }
            return data(
              {error: {[addressId]: error}},
              {
                status: 400,
              },
            );
          }
        }

        case 'DELETE': {
          // handles address deletion
          try {
            const {data, errors} = await customerAccount.mutate(
              DELETE_ADDRESS_MUTATION,
              {
                variables: {
                  addressId: decodeURIComponent(addressId),
                  language: customerAccount.i18n.language,
                },
              },
            );

            if (errors?.length) {
              throw new Error(errors[0].message);
            }

            if (data?.customerAddressDelete?.userErrors?.length) {
              throw new Error(data?.customerAddressDelete?.userErrors[0].message);
            }

            if (!data?.customerAddressDelete?.deletedAddressId) {
              throw new Error('Customer address delete failed.');
            }

            return {error: null, deletedAddress: addressId};
          } catch (error) {
            if (error instanceof Error) {
              return data(
                {error: {[addressId]: error.message}},
                {
                  status: 400,
                },
              );
            }
            return data(
              {error: {[addressId]: error}},
              {
                status: 400,
              },
            );
          }
        }

        default: {
          return data(
            {error: {[addressId]: 'Method not allowed'}},
            {
              status: 405,
            },
          );
        }
      }
    } catch (error) {
      if (error instanceof Error) {
        return data(
          {error: error.message},
          {
            status: 400,
          },
        );
      }
      return data(
        {error},
        {
          status: 400,
        },
      );
    }
  } else {
    // Handle profile update
    if (request.method !== 'PUT') {
      return data({error: 'Method not allowed'}, {status: 405});
    }

    try {
      const customer = {};
      const validInputKeys = ['firstName', 'lastName'];
      for (const [key, value] of form.entries()) {
        if (!validInputKeys.includes(key)) {
          continue;
        }
        if (typeof value === 'string' && value.length) {
          customer[key] = value;
        }
      }

      // update customer and possibly password
      const {data, errors} = await customerAccount.mutate(
        CUSTOMER_UPDATE_MUTATION,
        {
          variables: {
            customer,
            language: customerAccount.i18n.language,
          },
        },
      );

      if (errors?.length) {
        throw new Error(errors[0].message);
      }

      if (!data?.customerUpdate?.customer) {
        throw new Error('Customer profile update failed.');
      }

      return {
        error: null,
        customer: data?.customerUpdate?.customer,
      };
    } catch (error) {
      return data(
        {error: error.message, customer: null},
        {
          status: 400,
        },
      );
    }
  }
}

// US States list
const US_STATES = [
  { code: 'AL', name: 'Alabama' }, { code: 'AK', name: 'Alaska' }, { code: 'AZ', name: 'Arizona' },
  { code: 'AR', name: 'Arkansas' }, { code: 'CA', name: 'California' }, { code: 'CO', name: 'Colorado' },
  { code: 'CT', name: 'Connecticut' }, { code: 'DE', name: 'Delaware' }, { code: 'FL', name: 'Florida' },
  { code: 'GA', name: 'Georgia' }, { code: 'HI', name: 'Hawaii' }, { code: 'ID', name: 'Idaho' },
  { code: 'IL', name: 'Illinois' }, { code: 'IN', name: 'Indiana' }, { code: 'IA', name: 'Iowa' },
  { code: 'KS', name: 'Kansas' }, { code: 'KY', name: 'Kentucky' }, { code: 'LA', name: 'Louisiana' },
  { code: 'ME', name: 'Maine' }, { code: 'MD', name: 'Maryland' }, { code: 'MA', name: 'Massachusetts' },
  { code: 'MI', name: 'Michigan' }, { code: 'MN', name: 'Minnesota' }, { code: 'MS', name: 'Mississippi' },
  { code: 'MO', name: 'Missouri' }, { code: 'MT', name: 'Montana' }, { code: 'NE', name: 'Nebraska' },
  { code: 'NV', name: 'Nevada' }, { code: 'NH', name: 'New Hampshire' }, { code: 'NJ', name: 'New Jersey' },
  { code: 'NM', name: 'New Mexico' }, { code: 'NY', name: 'New York' }, { code: 'NC', name: 'North Carolina' },
  { code: 'ND', name: 'North Dakota' }, { code: 'OH', name: 'Ohio' }, { code: 'OK', name: 'Oklahoma' },
  { code: 'OR', name: 'Oregon' }, { code: 'PA', name: 'Pennsylvania' }, { code: 'RI', name: 'Rhode Island' },
  { code: 'SC', name: 'South Carolina' }, { code: 'SD', name: 'South Dakota' }, { code: 'TN', name: 'Tennessee' },
  { code: 'TX', name: 'Texas' }, { code: 'UT', name: 'Utah' }, { code: 'VT', name: 'Vermont' },
  { code: 'VA', name: 'Virginia' }, { code: 'WA', name: 'Washington' }, { code: 'WV', name: 'West Virginia' },
  { code: 'WI', name: 'Wisconsin' }, { code: 'WY', name: 'Wyoming' }
];

// Countries list
const COUNTRIES = [
  { code: 'US', name: 'United States' }, { code: 'CA', name: 'Canada' }, { code: 'GB', name: 'United Kingdom' },
  { code: 'AF', name: 'Afghanistan' }, { code: 'AL', name: 'Albania' }, { code: 'DZ', name: 'Algeria' },
  { code: 'AD', name: 'Andorra' }, { code: 'AO', name: 'Angola' }, { code: 'AG', name: 'Antigua & Barbuda' },
  { code: 'AR', name: 'Argentina' }, { code: 'AM', name: 'Armenia' }, { code: 'AU', name: 'Australia' },
  { code: 'AT', name: 'Austria' }, { code: 'AZ', name: 'Azerbaijan' }, { code: 'BS', name: 'Bahamas' },
  { code: 'BH', name: 'Bahrain' }, { code: 'BD', name: 'Bangladesh' }, { code: 'BB', name: 'Barbados' },
  { code: 'BY', name: 'Belarus' }, { code: 'BE', name: 'Belgium' }, { code: 'BZ', name: 'Belize' },
  { code: 'BJ', name: 'Benin' }, { code: 'BT', name: 'Bhutan' }, { code: 'BO', name: 'Bolivia' },
  { code: 'BA', name: 'Bosnia & Herzegovina' }, { code: 'BW', name: 'Botswana' }, { code: 'BR', name: 'Brazil' },
  { code: 'BN', name: 'Brunei' }, { code: 'BG', name: 'Bulgaria' }, { code: 'BF', name: 'Burkina Faso' },
  { code: 'BI', name: 'Burundi' }, { code: 'KH', name: 'Cambodia' }, { code: 'CM', name: 'Cameroon' },
  { code: 'CV', name: 'Cape Verde' }, { code: 'CF', name: 'Central African Republic' }, { code: 'TD', name: 'Chad' },
  { code: 'CL', name: 'Chile' }, { code: 'CN', name: 'China' }, { code: 'CO', name: 'Colombia' },
  { code: 'KM', name: 'Comoros' }, { code: 'CG', name: 'Congo' }, { code: 'CR', name: 'Costa Rica' },
  { code: 'HR', name: 'Croatia' }, { code: 'CU', name: 'Cuba' }, { code: 'CY', name: 'Cyprus' },
  { code: 'CZ', name: 'Czech Republic' }, { code: 'DK', name: 'Denmark' }, { code: 'DJ', name: 'Djibouti' },
  { code: 'DM', name: 'Dominica' }, { code: 'DO', name: 'Dominican Republic' }, { code: 'EC', name: 'Ecuador' },
  { code: 'EG', name: 'Egypt' }, { code: 'SV', name: 'El Salvador' }, { code: 'GQ', name: 'Equatorial Guinea' },
  { code: 'ER', name: 'Eritrea' }, { code: 'EE', name: 'Estonia' }, { code: 'ET', name: 'Ethiopia' },
  { code: 'FJ', name: 'Fiji' }, { code: 'FI', name: 'Finland' }, { code: 'FR', name: 'France' },
  { code: 'GA', name: 'Gabon' }, { code: 'GM', name: 'Gambia' }, { code: 'GE', name: 'Georgia' },
  { code: 'DE', name: 'Germany' }, { code: 'GH', name: 'Ghana' }, { code: 'GR', name: 'Greece' },
  { code: 'GD', name: 'Grenada' }, { code: 'GT', name: 'Guatemala' }, { code: 'GN', name: 'Guinea' },
  { code: 'GW', name: 'Guinea-Bissau' }, { code: 'GY', name: 'Guyana' }, { code: 'HT', name: 'Haiti' },
  { code: 'HN', name: 'Honduras' }, { code: 'HU', name: 'Hungary' }, { code: 'IS', name: 'Iceland' },
  { code: 'IN', name: 'India' }, { code: 'ID', name: 'Indonesia' }, { code: 'IR', name: 'Iran' },
  { code: 'IQ', name: 'Iraq' }, { code: 'IE', name: 'Ireland' }, { code: 'IL', name: 'Israel' },
  { code: 'IT', name: 'Italy' }, { code: 'JM', name: 'Jamaica' }, { code: 'JP', name: 'Japan' },
  { code: 'JO', name: 'Jordan' }, { code: 'KZ', name: 'Kazakhstan' }, { code: 'KE', name: 'Kenya' },
  { code: 'KI', name: 'Kiribati' }, { code: 'KW', name: 'Kuwait' }, { code: 'KG', name: 'Kyrgyzstan' },
  { code: 'LA', name: 'Laos' }, { code: 'LV', name: 'Latvia' }, { code: 'LB', name: 'Lebanon' },
  { code: 'LS', name: 'Lesotho' }, { code: 'LR', name: 'Liberia' }, { code: 'LY', name: 'Libya' },
  { code: 'LI', name: 'Liechtenstein' }, { code: 'LT', name: 'Lithuania' }, { code: 'LU', name: 'Luxembourg' },
  { code: 'MG', name: 'Madagascar' }, { code: 'MW', name: 'Malawi' }, { code: 'MY', name: 'Malaysia' },
  { code: 'MV', name: 'Maldives' }, { code: 'ML', name: 'Mali' }, { code: 'MT', name: 'Malta' },
  { code: 'MH', name: 'Marshall Islands' }, { code: 'MR', name: 'Mauritania' }, { code: 'MU', name: 'Mauritius' },
  { code: 'MX', name: 'Mexico' }, { code: 'FM', name: 'Micronesia' }, { code: 'MD', name: 'Moldova' },
  { code: 'MC', name: 'Monaco' }, { code: 'MN', name: 'Mongolia' }, { code: 'ME', name: 'Montenegro' },
  { code: 'MA', name: 'Morocco' }, { code: 'MZ', name: 'Mozambique' }, { code: 'MM', name: 'Myanmar' },
  { code: 'NA', name: 'Namibia' }, { code: 'NR', name: 'Nauru' }, { code: 'NP', name: 'Nepal' },
  { code: 'NL', name: 'Netherlands' }, { code: 'NZ', name: 'New Zealand' }, { code: 'NI', name: 'Nicaragua' },
  { code: 'NE', name: 'Niger' }, { code: 'NG', name: 'Nigeria' }, { code: 'KP', name: 'North Korea' },
  { code: 'MK', name: 'North Macedonia' }, { code: 'NO', name: 'Norway' }, { code: 'OM', name: 'Oman' },
  { code: 'PK', name: 'Pakistan' }, { code: 'PW', name: 'Palau' }, { code: 'PA', name: 'Panama' },
  { code: 'PG', name: 'Papua New Guinea' }, { code: 'PY', name: 'Paraguay' }, { code: 'PE', name: 'Peru' },
  { code: 'PH', name: 'Philippines' }, { code: 'PL', name: 'Poland' }, { code: 'PT', name: 'Portugal' },
  { code: 'QA', name: 'Qatar' }, { code: 'RO', name: 'Romania' }, { code: 'RU', name: 'Russia' },
  { code: 'RW', name: 'Rwanda' }, { code: 'KN', name: 'Saint Kitts & Nevis' }, { code: 'LC', name: 'Saint Lucia' },
  { code: 'VC', name: 'Saint Vincent & the Grenadines' }, { code: 'WS', name: 'Samoa' }, { code: 'SM', name: 'San Marino' },
  { code: 'ST', name: 'Sao Tome & Principe' }, { code: 'SA', name: 'Saudi Arabia' }, { code: 'SN', name: 'Senegal' },
  { code: 'RS', name: 'Serbia' }, { code: 'SC', name: 'Seychelles' }, { code: 'SL', name: 'Sierra Leone' },
  { code: 'SG', name: 'Singapore' }, { code: 'SK', name: 'Slovakia' }, { code: 'SI', name: 'Slovenia' },
  { code: 'SB', name: 'Solomon Islands' }, { code: 'SO', name: 'Somalia' }, { code: 'ZA', name: 'South Africa' },
  { code: 'KR', name: 'South Korea' }, { code: 'SS', name: 'South Sudan' }, { code: 'ES', name: 'Spain' },
  { code: 'LK', name: 'Sri Lanka' }, { code: 'SD', name: 'Sudan' }, { code: 'SR', name: 'Suriname' },
  { code: 'SE', name: 'Sweden' }, { code: 'CH', name: 'Switzerland' }, { code: 'SY', name: 'Syria' },
  { code: 'TW', name: 'Taiwan' }, { code: 'TJ', name: 'Tajikistan' }, { code: 'TZ', name: 'Tanzania' },
  { code: 'TH', name: 'Thailand' }, { code: 'TL', name: 'Timor-Leste' }, { code: 'TG', name: 'Togo' },
  { code: 'TO', name: 'Tonga' }, { code: 'TT', name: 'Trinidad & Tobago' }, { code: 'TN', name: 'Tunisia' },
  { code: 'TR', name: 'Turkey' }, { code: 'TM', name: 'Turkmenistan' }, { code: 'TV', name: 'Tuvalu' },
  { code: 'UG', name: 'Uganda' }, { code: 'UA', name: 'Ukraine' }, { code: 'AE', name: 'United Arab Emirates' },
  { code: 'UY', name: 'Uruguay' }, { code: 'UZ', name: 'Uzbekistan' }, { code: 'VU', name: 'Vanuatu' },
  { code: 'VA', name: 'Vatican City' }, { code: 'VE', name: 'Venezuela' }, { code: 'VN', name: 'Vietnam' },
  { code: 'YE', name: 'Yemen' }, { code: 'ZM', name: 'Zambia' }, { code: 'ZW', name: 'Zimbabwe' }
];

export default function AccountProfile() {
  const account = useOutletContext();
  const loaderData = useLoaderData();
  const {state} = useNavigation();
  /** @type {ActionReturnData} */
  const action = useActionData();
  const customer = action?.customer ?? account?.customer;
  const {defaultAddress, addresses} = customer;
  const {orders, filters} = loaderData;

  // Modal state management
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [isAddAddressOpen, setIsAddAddressOpen] = useState(false);
  const [isEditAddressOpen, setIsEditAddressOpen] = useState(false);
  const [isEditProfileClosing, setIsEditProfileClosing] = useState(false);
  const [isAddAddressClosing, setIsAddAddressClosing] = useState(false);
  const [isEditAddressClosing, setIsEditAddressClosing] = useState(false);

  // Track which address is being edited
  const [selectedAddress, setSelectedAddress] = useState(null);

  // Form data for modals
  const [selectedCountryAdd, setSelectedCountryAdd] = useState('US');
  const [selectedCountryEdit, setSelectedCountryEdit] = useState('US');

  // Close handlers with animation
  const closeEditProfile = () => {
    setIsEditProfileClosing(true);
    setTimeout(() => {
      setIsEditProfileOpen(false);
      setIsEditProfileClosing(false);
    }, 300);
  };

  const closeAddAddress = () => {
    setIsAddAddressClosing(true);
    setTimeout(() => {
      setIsAddAddressOpen(false);
      setIsAddAddressClosing(false);
    }, 300);
  };

  const closeEditAddress = () => {
    setIsEditAddressClosing(true);
    setTimeout(() => {
      setIsEditAddressOpen(false);
      setIsEditAddressClosing(false);
      setSelectedAddress(null);
    }, 300);
  };

  // Helper function to open edit address modal with specific address
  const openEditAddress = (address) => {
    setSelectedAddress(address);
    setSelectedCountryEdit(address.territoryCode || 'US');
    setIsEditAddressOpen(true);
  };

  return (
    <div className="account-profile">
      <div className="account-profile-grid">
        {/* Left Column - Orders */}
        <div className="orders-column">
          <OrdersTable orders={orders} filters={filters} />
        </div>

        {/* Right Column - Account Details */}
        <div className="profile-column">
          <fieldset>
            <h2 style={{fontSize: '1.5rem', fontWeight: '500', margin: '0 0 1.5rem 0'}}>Account details</h2>

            {/* Profile Section */}
            <div style={{marginBottom: '2rem'}}>
              <div style={{display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1rem'}}>
                <h3 style={{fontSize: '1.1rem', fontWeight: '500', margin: 0}}>Profile</h3>
                <button onClick={() => setIsEditProfileOpen(true)} style={{color: '#9CA3AF', display: 'flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 0}}>
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                    <path d="M22.853,1.148a3.626,3.626,0,0,0-5.124,0L1.465,17.412A4.968,4.968,0,0,0,0,20.947V23a1,1,0,0,0,1,1H3.053a4.966,4.966,0,0,0,3.535-1.464L22.853,6.271A3.626,3.626,0,0,0,22.853,1.148ZM5.174,21.122A3.022,3.022,0,0,1,3.053,22H2V20.947a2.98,2.98,0,0,1,.879-2.121L15.222,6.483l2.3,2.3ZM21.438,4.857,18.932,7.364l-2.3-2.295,2.507-2.507a1.623,1.623,0,1,1,2.295,2.3Z"/>
                  </svg>
                </button>
              </div>
              <div style={{paddingLeft: '1rem'}}>
                <p style={{marginBottom: '10px'}}>
                  {customer.firstName} {customer.lastName}
                </p>
                <p style={{marginBottom: '10px'}}>
                  {customer.emailAddress?.emailAddress || 'No email'}
                </p>
              </div>
            </div>

            {/* Addresses Section */}
            <div>
              <div style={{display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '1rem'}}>
                <h3 style={{fontSize: '1.1rem', fontWeight: '500', margin: 0}}>Addresses</h3>
                <button onClick={() => setIsAddAddressOpen(true)} style={{color: '#9CA3AF', textDecoration: 'none', fontSize: '1rem', background: 'none', border: 'none', cursor: 'pointer', padding: 0}}>+ Add</button>
              </div>
              <div style={{paddingLeft: '1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem'}}>
                {/* Default Address */}
                {defaultAddress && (
                  <div style={{border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '8px', padding: '1rem', position: 'relative'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem'}}>
                      <span style={{fontSize: '0.85rem', color: '#4A9EFF', fontWeight: '500'}}>DEFAULT ADDRESS</span>
                      <button onClick={() => openEditAddress(defaultAddress)} style={{color: '#9CA3AF', display: 'flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 0}}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                          <path d="M22.853,1.148a3.626,3.626,0,0,0-5.124,0L1.465,17.412A4.968,4.968,0,0,0,0,20.947V23a1,1,0,0,0,1,1H3.053a4.966,4.966,0,0,0,3.535-1.464L22.853,6.271A3.626,3.626,0,0,0,22.853,1.148ZM5.174,21.122A3.022,3.022,0,0,1,3.053,22H2V20.947a2.98,2.98,0,0,1,.879-2.121L15.222,6.483l2.3,2.3ZM21.438,4.857,18.932,7.364l-2.3-2.295,2.507-2.507a1.623,1.623,0,1,1,2.295,2.3Z"/>
                        </svg>
                      </button>
                    </div>
                    <p style={{margin: '0.25rem 0', fontSize: '0.95rem'}}>
                      {(defaultAddress.firstName || customer.firstName) + ' ' + (defaultAddress.lastName || customer.lastName)}
                    </p>
                    <p style={{margin: '0.25rem 0', fontSize: '0.95rem'}}>
                      {defaultAddress.address1 || 'No street address'}
                    </p>
                    {defaultAddress.address2 && (
                      <p style={{margin: '0.25rem 0', fontSize: '0.95rem'}}>
                        {defaultAddress.address2}
                      </p>
                    )}
                    <p style={{margin: '0.25rem 0', fontSize: '0.95rem'}}>
                      {defaultAddress.city || 'No city'}, {defaultAddress.zoneCode || defaultAddress.provinceCode || 'No state'} {defaultAddress.zip || ''}
                    </p>
                    <p style={{margin: '0.25rem 0', fontSize: '0.95rem'}}>
                      {defaultAddress.territoryCode === 'US' ? 'United States' : defaultAddress.territoryCode || 'No country'}
                    </p>
                  </div>
                )}

                {/* Additional Addresses */}
                {addresses?.nodes && addresses.nodes.filter(addr => addr.id !== defaultAddress?.id).map((address) => (
                  <div key={address.id} style={{border: '1px solid rgba(255, 255, 255, 0.2)', borderRadius: '8px', padding: '1rem', position: 'relative'}}>
                    <div style={{display: 'flex', justifyContent: 'flex-end', alignItems: 'flex-start', marginBottom: '0.5rem'}}>
                      <button onClick={() => openEditAddress(address)} style={{color: '#9CA3AF', display: 'flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 0}}>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                          <path d="M22.853,1.148a3.626,3.626,0,0,0-5.124,0L1.465,17.412A4.968,4.968,0,0,0,0,20.947V23a1,1,0,0,0,1,1H3.053a4.966,4.966,0,0,0,3.535-1.464L22.853,6.271A3.626,3.626,0,0,0,22.853,1.148ZM5.174,21.122A3.022,3.022,0,0,1,3.053,22H2V20.947a2.98,2.98,0,0,1,.879-2.121L15.222,6.483l2.3,2.3ZM21.438,4.857,18.932,7.364l-2.3-2.295,2.507-2.507a1.623,1.623,0,1,1,2.295,2.3Z"/>
                        </svg>
                      </button>
                    </div>
                    <p style={{margin: '0.25rem 0', fontSize: '0.95rem'}}>
                      {(address.firstName || customer.firstName) + ' ' + (address.lastName || customer.lastName)}
                    </p>
                    <p style={{margin: '0.25rem 0', fontSize: '0.95rem'}}>
                      {address.address1 || 'No street address'}
                    </p>
                    {address.address2 && (
                      <p style={{margin: '0.25rem 0', fontSize: '0.95rem'}}>
                        {address.address2}
                      </p>
                    )}
                    <p style={{margin: '0.25rem 0', fontSize: '0.95rem'}}>
                      {address.city || 'No city'}, {address.zoneCode || address.provinceCode || 'No state'} {address.zip || ''}
                    </p>
                    <p style={{margin: '0.25rem 0', fontSize: '0.95rem'}}>
                      {address.territoryCode === 'US' ? 'United States' : address.territoryCode || 'No country'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </fieldset>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditProfileOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          animation: isEditProfileClosing ? 'fadeOut 0.3s ease-out' : 'fadeIn 0.3s ease-out'
        }} onClick={closeEditProfile}>
          <Form method="PUT" style={{
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '20px',
            padding: '30px',
            color: '#fff',
            maxWidth: '500px',
            width: '90%',
            position: 'relative',
            animation: isEditProfileClosing ? 'slideOut 0.3s ease-out' : 'slideIn 0.3s ease-out'
          }} onClick={(e) => e.stopPropagation()} onSubmit={() => setTimeout(closeEditProfile, 100)}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
              <h2 style={{margin: 0, fontSize: '1.5rem'}}>Edit profile</h2>
              <button type="button" onClick={closeEditProfile} style={{background: 'none', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer', padding: 0}}>×</button>
            </div>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px'}}>
              <div>
                <input type="text" name="firstName" placeholder="First name" defaultValue={customer.firstName} style={{width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.2)', background: 'rgba(255, 255, 255, 0.1)', color: 'white'}} />
              </div>
              <div>
                <input type="text" name="lastName" placeholder="Last name" defaultValue={customer.lastName} style={{width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.2)', background: 'rgba(255, 255, 255, 0.1)', color: 'white'}} />
              </div>
            </div>
            <div style={{marginBottom: '10px'}}>
              <input type="email" name="email" placeholder="Email" defaultValue={customer.emailAddress?.emailAddress} disabled style={{width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.2)', background: 'rgba(255, 255, 255, 0.1)', color: 'white', opacity: 0.6}} />
            </div>
            <p style={{fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '20px'}}>This email is used for sign-in and order updates.</p>
            <div style={{display: 'flex', justifyContent: 'flex-end', gap: '10px'}}>
              <button type="button" onClick={closeEditProfile} style={{padding: '10px 20px', background: 'none', border: 'none', color: '#4A9EFF', cursor: 'pointer', fontSize: '1rem'}}>Cancel</button>
              <button type="submit" style={{padding: '10px 20px', background: '#4A9EFF', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer', fontSize: '1rem'}}>Save</button>
            </div>
          </Form>
        </div>
      )}

      {/* Add Address Modal */}
      {isAddAddressOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          animation: isAddAddressClosing ? 'fadeOut 0.3s ease-out' : 'fadeIn 0.3s ease-out'
        }} onClick={closeAddAddress}>
          <Form method="POST" style={{
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '20px',
            padding: '30px',
            color: '#fff',
            maxWidth: '600px',
            width: '90%',
            position: 'relative',
            animation: isAddAddressClosing ? 'slideOut 0.3s ease-out' : 'slideIn 0.3s ease-out'
          }} onClick={(e) => e.stopPropagation()} onSubmit={() => setTimeout(closeAddAddress, 100)}>
            <input type="hidden" name="addressId" value="new" />
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
              <h2 style={{margin: 0, fontSize: '1.5rem'}}>Add address</h2>
              <button type="button" onClick={closeAddAddress} style={{background: 'none', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer', padding: 0}}>×</button>
            </div>
            <div style={{marginBottom: '15px'}}>
              <label style={{display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', cursor: 'pointer'}}>
                <input type="checkbox" name="defaultAddress" style={{cursor: 'pointer', flexShrink: 0, width: '16px', height: '16px'}} />
                <span style={{flex: 1}}>This is my default address</span>
              </label>
            </div>
            <div style={{marginBottom: '15px'}}>
              <select name="territoryCode" value={selectedCountryAdd} onChange={(e) => setSelectedCountryAdd(e.target.value)} style={{width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.2)', background: 'rgba(255, 255, 255, 0.1)', color: 'white'}}>
                {COUNTRIES.map(country => (
                  <option key={country.code} value={country.code}>{country.name}</option>
                ))}
              </select>
            </div>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px'}}>
              <div>
                <input type="text" name="firstName" placeholder="First name" required style={{width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.2)', background: 'rgba(255, 255, 255, 0.1)', color: 'white'}} />
              </div>
              <div>
                <input type="text" name="lastName" placeholder="Last name" required style={{width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.2)', background: 'rgba(255, 255, 255, 0.1)', color: 'white'}} />
              </div>
            </div>
            <div style={{marginBottom: '15px'}}>
              <input type="text" name="address1" placeholder="Address" required style={{width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.2)', background: 'rgba(255, 255, 255, 0.1)', color: 'white'}} />
            </div>
            <div style={{marginBottom: '15px'}}>
              <input type="text" name="address2" placeholder="Apartment, suite, etc (optional)" style={{width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.2)', background: 'rgba(255, 255, 255, 0.1)', color: 'white'}} />
            </div>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '20px'}}>
              <div>
                <input type="text" name="city" placeholder="City" required style={{width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.2)', background: 'rgba(255, 255, 255, 0.1)', color: 'white'}} />
              </div>
              <div>
                {selectedCountryAdd === 'US' ? (
                  <select name="zoneCode" required style={{width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.2)', background: 'rgba(255, 255, 255, 0.1)', color: 'white'}}>
                    <option value="">State</option>
                    {US_STATES.map(state => (
                      <option key={state.code} value={state.code}>{state.name}</option>
                    ))}
                  </select>
                ) : (
                  <input type="text" name="zoneCode" placeholder="State/Province" required style={{width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.2)', background: 'rgba(255, 255, 255, 0.1)', color: 'white'}} />
                )}
              </div>
              <div>
                <input type="text" name="zip" placeholder="ZIP code" required style={{width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.2)', background: 'rgba(255, 255, 255, 0.1)', color: 'white'}} />
              </div>
            </div>
            <div style={{display: 'flex', justifyContent: 'flex-end', gap: '10px'}}>
              <button type="button" onClick={closeAddAddress} style={{padding: '10px 20px', background: 'none', border: 'none', color: '#4A9EFF', cursor: 'pointer', fontSize: '1rem'}}>Cancel</button>
              <button type="submit" style={{padding: '10px 20px', background: '#4A9EFF', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer', fontSize: '1rem'}}>Save</button>
            </div>
          </Form>
        </div>
      )}

      {/* Edit Address Modal */}
      {isEditAddressOpen && selectedAddress && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          animation: isEditAddressClosing ? 'fadeOut 0.3s ease-out' : 'fadeIn 0.3s ease-out'
        }} onClick={closeEditAddress}>
          <Form method="PUT" style={{
            background: 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '20px',
            padding: '30px',
            color: '#fff',
            maxWidth: '600px',
            width: '90%',
            position: 'relative',
            animation: isEditAddressClosing ? 'slideOut 0.3s ease-out' : 'slideIn 0.3s ease-out'
          }} onClick={(e) => e.stopPropagation()} onSubmit={() => setTimeout(closeEditAddress, 100)}>
            <input type="hidden" name="addressId" value={selectedAddress.id} />
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
              <h2 style={{margin: 0, fontSize: '1.5rem'}}>Edit address</h2>
              <button type="button" onClick={closeEditAddress} style={{background: 'none', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer', padding: 0}}>×</button>
            </div>
            <div style={{marginBottom: '15px'}}>
              <label style={{display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', cursor: 'pointer'}}>
                <input type="checkbox" name="defaultAddress" defaultChecked={selectedAddress.id === defaultAddress?.id} style={{cursor: 'pointer', flexShrink: 0, width: '16px', height: '16px'}} />
                <span style={{flex: 1}}>This is my default address</span>
              </label>
            </div>
            <div style={{marginBottom: '15px'}}>
              <select name="territoryCode" value={selectedCountryEdit} onChange={(e) => setSelectedCountryEdit(e.target.value)} style={{width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.2)', background: 'rgba(255, 255, 255, 0.1)', color: 'white'}}>
                {COUNTRIES.map(country => (
                  <option key={country.code} value={country.code}>{country.name}</option>
                ))}
              </select>
            </div>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px'}}>
              <div>
                <input type="text" name="firstName" placeholder="First name" defaultValue={selectedAddress.firstName || customer.firstName} required style={{width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.2)', background: 'rgba(255, 255, 255, 0.1)', color: 'white'}} />
              </div>
              <div>
                <input type="text" name="lastName" placeholder="Last name" defaultValue={selectedAddress.lastName || customer.lastName} required style={{width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.2)', background: 'rgba(255, 255, 255, 0.1)', color: 'white'}} />
              </div>
            </div>
            <div style={{marginBottom: '15px'}}>
              <input type="text" name="address1" placeholder="Address" defaultValue={selectedAddress.address1 || ''} required style={{width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.2)', background: 'rgba(255, 255, 255, 0.1)', color: 'white'}} />
            </div>
            <div style={{marginBottom: '15px'}}>
              <input type="text" name="address2" placeholder="Apartment, suite, etc (optional)" defaultValue={selectedAddress.address2 || ''} style={{width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.2)', background: 'rgba(255, 255, 255, 0.1)', color: 'white'}} />
            </div>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '20px'}}>
              <div>
                <input type="text" name="city" placeholder="City" defaultValue={selectedAddress.city || ''} required style={{width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.2)', background: 'rgba(255, 255, 255, 0.1)', color: 'white'}} />
              </div>
              <div>
                {selectedCountryEdit === 'US' ? (
                  <select name="zoneCode" defaultValue={selectedAddress.zoneCode || ''} required style={{width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.2)', background: 'rgba(255, 255, 255, 0.1)', color: 'white'}}>
                    <option value="">State</option>
                    {US_STATES.map(state => (
                      <option key={state.code} value={state.code}>{state.name}</option>
                    ))}
                  </select>
                ) : (
                  <input type="text" name="zoneCode" placeholder="State/Province" defaultValue={selectedAddress.zoneCode || ''} required style={{width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.2)', background: 'rgba(255, 255, 255, 0.1)', color: 'white'}} />
                )}
              </div>
              <div>
                <input type="text" name="zip" placeholder="ZIP code" defaultValue={selectedAddress.zip || ''} required style={{width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.2)', background: 'rgba(255, 255, 255, 0.1)', color: 'white'}} />
              </div>
            </div>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <Form method="DELETE" style={{display: 'inline'}}>
                <input type="hidden" name="addressId" value={selectedAddress.id} />
                <button type="submit" style={{padding: '10px 20px', background: 'none', border: 'none', color: '#FF4444', cursor: 'pointer', fontSize: '1rem'}}>Delete</button>
              </Form>
              <div style={{display: 'flex', gap: '10px'}}>
                <button type="button" onClick={closeEditAddress} style={{padding: '10px 20px', background: 'none', border: 'none', color: '#4A9EFF', cursor: 'pointer', fontSize: '1rem'}}>Cancel</button>
                <button type="submit" style={{padding: '10px 20px', background: '#4A9EFF', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer', fontSize: '1rem'}}>Save</button>
              </div>
            </div>
          </Form>
        </div>
      )}
    </div>
  );
}

function NewAddressForm() {
  const newAddress = {
    address1: '',
    address2: '',
    city: '',
    company: '',
    territoryCode: '',
    firstName: '',
    id: 'new',
    lastName: '',
    phoneNumber: '',
    zoneCode: '',
    zip: '',
  };

  return (
    <AddressForm
      addressId={'NEW_ADDRESS_ID'}
      address={newAddress}
      defaultAddress={null}
    >
      {({stateForMethod}) => (
        <div>
          <button
            disabled={stateForMethod('POST') !== 'idle'}
            formMethod="POST"
            type="submit"
          >
            {stateForMethod('POST') !== 'idle' ? 'Creating' : 'Create'}
          </button>
        </div>
      )}
    </AddressForm>
  );
}

/**
 * @param {Pick<CustomerFragment, 'addresses' | 'defaultAddress'>}
 */
function ExistingAddresses({addresses, defaultAddress}) {
  return (
    <div>
      <legend>Addresses</legend>
      {addresses.nodes.map((address) => (
        <AddressForm
          key={address.id}
          addressId={address.id}
          address={address}
          defaultAddress={defaultAddress}
        >
          {({stateForMethod}) => (
            <div>
              <button
                disabled={stateForMethod('PUT') !== 'idle'}
                formMethod="PUT"
                type="submit"
              >
                {stateForMethod('PUT') !== 'idle' ? 'Saving' : 'Save'}
              </button>
              <button
                disabled={stateForMethod('DELETE') !== 'idle'}
                formMethod="DELETE"
                type="submit"
              >
                {stateForMethod('DELETE') !== 'idle' ? 'Deleting' : 'Delete'}
              </button>
            </div>
          )}
        </AddressForm>
      ))}
    </div>
  );
}

/**
 * @param {{
 *   addressId: AddressFragment['id'];
 *   address: CustomerAddressInput;
 *   defaultAddress: CustomerFragment['defaultAddress'];
 *   children: (props: {
 *     stateForMethod: (method: 'PUT' | 'POST' | 'DELETE') => Fetcher['state'];
 *   }) => React.ReactNode;
 * }}
 */
export function AddressForm({addressId, address, defaultAddress, children}) {
  const {state, formMethod} = useNavigation();
  /** @type {ActionReturnData} */
  const action = useActionData();
  const error = action?.error?.[addressId];
  const isDefaultAddress = defaultAddress?.id === addressId;
  return (
    <Form id={addressId}>
      <fieldset>
        <input type="hidden" name="addressId" defaultValue={addressId} />
        <label htmlFor="firstName">First name*</label>
        <input
          aria-label="First name"
          autoComplete="given-name"
          defaultValue={address?.firstName ?? ''}
          id="firstName"
          name="firstName"
          placeholder="First name"
          required
          type="text"
        />
        <label htmlFor="lastName">Last name*</label>
        <input
          aria-label="Last name"
          autoComplete="family-name"
          defaultValue={address?.lastName ?? ''}
          id="lastName"
          name="lastName"
          placeholder="Last name"
          required
          type="text"
        />
        <label htmlFor="company">Company</label>
        <input
          aria-label="Company"
          autoComplete="organization"
          defaultValue={address?.company ?? ''}
          id="company"
          name="company"
          placeholder="Company"
          type="text"
        />
        <label htmlFor="address1">Address line*</label>
        <input
          aria-label="Address line 1"
          autoComplete="address-line1"
          defaultValue={address?.address1 ?? ''}
          id="address1"
          name="address1"
          placeholder="Address line 1*"
          required
          type="text"
        />
        <label htmlFor="address2">Address line 2</label>
        <input
          aria-label="Address line 2"
          autoComplete="address-line2"
          defaultValue={address?.address2 ?? ''}
          id="address2"
          name="address2"
          placeholder="Address line 2"
          type="text"
        />
        <label htmlFor="city">City*</label>
        <input
          aria-label="City"
          autoComplete="address-level2"
          defaultValue={address?.city ?? ''}
          id="city"
          name="city"
          placeholder="City"
          required
          type="text"
        />
        <label htmlFor="zoneCode">State / Province*</label>
        <input
          aria-label="State/Province"
          autoComplete="address-level1"
          defaultValue={address?.zoneCode ?? ''}
          id="zoneCode"
          name="zoneCode"
          placeholder="State / Province"
          required
          type="text"
        />
        <label htmlFor="zip">Zip / Postal Code*</label>
        <input
          aria-label="Zip"
          autoComplete="postal-code"
          defaultValue={address?.zip ?? ''}
          id="zip"
          name="zip"
          placeholder="Zip / Postal Code"
          required
          type="text"
        />
        <label htmlFor="territoryCode">Country Code*</label>
        <input
          aria-label="territoryCode"
          autoComplete="country"
          defaultValue={address?.territoryCode ?? ''}
          id="territoryCode"
          name="territoryCode"
          placeholder="Country"
          required
          type="text"
          maxLength={2}
        />
        <label htmlFor="phoneNumber">Phone</label>
        <input
          aria-label="Phone Number"
          autoComplete="tel"
          defaultValue={address?.phoneNumber ?? ''}
          id="phoneNumber"
          name="phoneNumber"
          placeholder="+16135551111"
          pattern="^\+?[1-9]\d{3,14}$"
          type="tel"
        />
        <div>
          <input
            defaultChecked={isDefaultAddress}
            id="defaultAddress"
            name="defaultAddress"
            type="checkbox"
          />
          <label htmlFor="defaultAddress">Set as default address</label>
        </div>
        {error ? (
          <p>
            <mark>
              <small>{error}</small>
            </mark>
          </p>
        ) : (
          <br />
        )}
        {children({
          stateForMethod: (method) => (formMethod === method ? state : 'idle'),
        })}
      </fieldset>
    </Form>
  );
}

/**
 * @param {{
 *   orders: CustomerOrdersFragment['orders'];
 *   filters: OrderFilterParams;
 * }}
 */
function OrdersTable({orders, filters}) {
  const hasFilters = !!(filters.name || filters.confirmationNumber);

  return (
    <div className="acccount-orders" aria-live="polite">
      <fieldset>
        <h2 style={{fontSize: '1.5rem', fontWeight: '500', marginBottom: '1.5rem', margin: '0 0 1.5rem 0'}}>Orders</h2>
        {orders?.nodes.length ? (
          <PaginatedResourceSection connection={orders}>
            {({node: order}) => <OrderItem key={order.id} order={order} />}
          </PaginatedResourceSection>
        ) : (
          <EmptyOrders hasFilters={hasFilters} />
        )}
      </fieldset>
    </div>
  );
}

/**
 * @param {{hasFilters?: boolean}}
 */
function EmptyOrders({hasFilters = false}) {
  return (
    <div>
      {hasFilters ? (
        <>
          <p>No orders found matching your search.</p>
          <br />
          <p>
            <Link to="/account/profile">Clear filters →</Link>
          </p>
        </>
      ) : (
        <>
          <p>You don't own any ULTRLX pieces yet.</p>
          <br />
          <p>
            <Link to="/" style={{color: 'white', textDecoration: 'underline'}}>Explore Drops →</Link>
          </p>
        </>
      )}
    </div>
  );
}

/**
 * @param {{order: OrderItemFragment}}
 */
function OrderItem({order}) {
  const fulfillmentStatus = flattenConnection(order.fulfillments)[0]?.status;
  return (
    <>
      <fieldset>
        <Link to={`/account/orders/${btoa(order.id)}`}>
          <strong>#{order.number}</strong>
        </Link>
        <p>{new Date(order.processedAt).toDateString()}</p>
        {order.confirmationNumber && (
          <p>Confirmation: {order.confirmationNumber}</p>
        )}
        <p>{order.financialStatus}</p>
        {fulfillmentStatus && <p>{fulfillmentStatus}</p>}
        <Money data={order.totalPrice} />
        <Link to={`/account/orders/${btoa(order.id)}`}>View Order →</Link>
      </fieldset>
      <br />
    </>
  );
}

/**
 * @typedef {{
 *   error: string | null;
 *   customer: CustomerFragment | null;
 * }} ProfileActionResponse
 */

/**
 * @typedef {{
 *   addressId?: string | null;
 *   createdAddress?: AddressFragment;
 *   defaultAddress?: string | null;
 *   deletedAddress?: string | null;
 *   error: Record<AddressFragment['id'], string> | null;
 *   updatedAddress?: AddressFragment;
 * }} AddressActionResponse
 */

/** @typedef {import('@shopify/hydrogen/customer-account-api-types').CustomerAddressInput} CustomerAddressInput */
/** @typedef {import('@shopify/hydrogen/customer-account-api-types').CustomerUpdateInput} CustomerUpdateInput */
/** @typedef {import('customer-accountapi.generated').AddressFragment} AddressFragment */
/** @typedef {import('customer-accountapi.generated').CustomerFragment} CustomerFragment */
/** @typedef {import('customer-accountapi.generated').CustomerOrdersFragment} CustomerOrdersFragment */
/** @typedef {import('customer-accountapi.generated').OrderItemFragment} OrderItemFragment */
/** @typedef {import('~/lib/orderFilters').OrderFilterParams} OrderFilterParams */
/** @template T @typedef {import('react-router').Fetcher<T>} Fetcher */
/** @typedef {import('./+types/account.profile').Route} Route */
/** @typedef {import('@shopify/remix-oxygen').SerializeFrom<typeof loader>} LoaderReturnData */
/** @typedef {import('@shopify/remix-oxygen').SerializeFrom<typeof action>} ActionReturnData */
