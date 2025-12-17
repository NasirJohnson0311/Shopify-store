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
    }, 300);
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
              <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem'}}>
                <h3 style={{fontSize: '1.1rem', fontWeight: '500', margin: 0}}>Profile</h3>
                <button onClick={() => setIsEditProfileOpen(true)} style={{color: 'white', display: 'flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 0}}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-pencil" viewBox="0 0 16 16">
                    <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325"/>
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
              <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem'}}>
                <h3 style={{fontSize: '1.1rem', fontWeight: '500', margin: 0}}>Addresses</h3>
                <button onClick={() => setIsAddAddressOpen(true)} style={{color: 'white', textDecoration: 'none', fontSize: '1rem', background: 'none', border: 'none', cursor: 'pointer', padding: 0}}>+ Add</button>
              </div>
              <div style={{paddingLeft: '1rem'}}>
                {defaultAddress && (
                  <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <p style={{margin: 0}}>
                      {defaultAddress.territoryCode === 'US' ? 'United States' : defaultAddress.territoryCode}
                    </p>
                    <button onClick={() => setIsEditAddressOpen(true)} style={{color: 'white', display: 'flex', alignItems: 'center', background: 'none', border: 'none', cursor: 'pointer', padding: 0}}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-pencil" viewBox="0 0 16 16">
                        <path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325"/>
                      </svg>
                    </button>
                  </div>
                )}
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
          <div style={{
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
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
              <h2 style={{margin: 0, fontSize: '1.5rem'}}>Edit profile</h2>
              <button onClick={closeEditProfile} style={{background: 'none', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer', padding: 0}}>×</button>
            </div>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px'}}>
              <div>
                <label style={{display: 'block', marginBottom: '5px', fontSize: '0.9rem'}}>First name</label>
                <input type="text" defaultValue={customer.firstName} style={{width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.2)', background: 'rgba(255, 255, 255, 0.1)', color: 'white'}} />
              </div>
              <div>
                <label style={{display: 'block', marginBottom: '5px', fontSize: '0.9rem'}}>Last name</label>
                <input type="text" defaultValue={customer.lastName} style={{width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.2)', background: 'rgba(255, 255, 255, 0.1)', color: 'white'}} />
              </div>
            </div>
            <div style={{marginBottom: '10px'}}>
              <label style={{display: 'block', marginBottom: '5px', fontSize: '0.9rem'}}>Email</label>
              <input type="email" defaultValue={customer.emailAddress?.emailAddress} style={{width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.2)', background: 'rgba(255, 255, 255, 0.1)', color: 'white'}} />
            </div>
            <p style={{fontSize: '0.85rem', color: 'rgba(255, 255, 255, 0.7)', marginBottom: '20px'}}>This email is used for sign-in and order updates.</p>
            <div style={{display: 'flex', justifyContent: 'flex-end', gap: '10px'}}>
              <button onClick={closeEditProfile} style={{padding: '10px 20px', background: 'none', border: 'none', color: '#4A9EFF', cursor: 'pointer', fontSize: '1rem'}}>Cancel</button>
              <button style={{padding: '10px 20px', background: '#4A9EFF', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer', fontSize: '1rem'}}>Save</button>
            </div>
          </div>
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
          <div style={{
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
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
              <h2 style={{margin: 0, fontSize: '1.5rem'}}>Add address</h2>
              <button onClick={closeAddAddress} style={{background: 'none', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer', padding: 0}}>×</button>
            </div>
            <div style={{marginBottom: '15px'}}>
              <label style={{display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem'}}>
                <input type="checkbox" />
                This is my default address
              </label>
            </div>
            <div style={{marginBottom: '15px'}}>
              <label style={{display: 'block', marginBottom: '5px', fontSize: '0.9rem'}}>Country/region</label>
              <select style={{width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.2)', background: 'rgba(255, 255, 255, 0.1)', color: 'white'}}>
                <option>United States</option>
              </select>
            </div>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px'}}>
              <div>
                <label style={{display: 'block', marginBottom: '5px', fontSize: '0.9rem'}}>First name</label>
                <input type="text" placeholder="First name" style={{width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.2)', background: 'rgba(255, 255, 255, 0.1)', color: 'white'}} />
              </div>
              <div>
                <label style={{display: 'block', marginBottom: '5px', fontSize: '0.9rem'}}>Last name</label>
                <input type="text" placeholder="Last name" style={{width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.2)', background: 'rgba(255, 255, 255, 0.1)', color: 'white'}} />
              </div>
            </div>
            <div style={{marginBottom: '15px'}}>
              <label style={{display: 'block', marginBottom: '5px', fontSize: '0.9rem'}}>Address</label>
              <input type="text" placeholder="Address" style={{width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.2)', background: 'rgba(255, 255, 255, 0.1)', color: 'white'}} />
            </div>
            <div style={{marginBottom: '15px'}}>
              <label style={{display: 'block', marginBottom: '5px', fontSize: '0.9rem'}}>Apartment, suite, etc (optional)</label>
              <input type="text" placeholder="Apartment, suite, etc (optional)" style={{width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.2)', background: 'rgba(255, 255, 255, 0.1)', color: 'white'}} />
            </div>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '20px'}}>
              <div>
                <label style={{display: 'block', marginBottom: '5px', fontSize: '0.9rem'}}>City</label>
                <input type="text" placeholder="City" style={{width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.2)', background: 'rgba(255, 255, 255, 0.1)', color: 'white'}} />
              </div>
              <div>
                <label style={{display: 'block', marginBottom: '5px', fontSize: '0.9rem'}}>State</label>
                <select style={{width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.2)', background: 'rgba(255, 255, 255, 0.1)', color: 'white'}}>
                  <option>Alabama</option>
                </select>
              </div>
              <div>
                <label style={{display: 'block', marginBottom: '5px', fontSize: '0.9rem'}}>ZIP code</label>
                <input type="text" placeholder="ZIP code" style={{width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.2)', background: 'rgba(255, 255, 255, 0.1)', color: 'white'}} />
              </div>
            </div>
            <div style={{display: 'flex', justifyContent: 'flex-end', gap: '10px'}}>
              <button onClick={closeAddAddress} style={{padding: '10px 20px', background: 'none', border: 'none', color: '#4A9EFF', cursor: 'pointer', fontSize: '1rem'}}>Cancel</button>
              <button style={{padding: '10px 20px', background: '#4A9EFF', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer', fontSize: '1rem'}}>Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Address Modal */}
      {isEditAddressOpen && (
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
          <div style={{
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
          }} onClick={(e) => e.stopPropagation()}>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px'}}>
              <h2 style={{margin: 0, fontSize: '1.5rem'}}>Edit address</h2>
              <button onClick={closeEditAddress} style={{background: 'none', border: 'none', color: 'white', fontSize: '1.5rem', cursor: 'pointer', padding: 0}}>×</button>
            </div>
            <div style={{marginBottom: '15px'}}>
              <label style={{display: 'block', marginBottom: '5px', fontSize: '0.9rem'}}>Country/region</label>
              <select style={{width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.2)', background: 'rgba(255, 255, 255, 0.1)', color: 'white'}}>
                <option>United States</option>
              </select>
            </div>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '15px'}}>
              <div>
                <label style={{display: 'block', marginBottom: '5px', fontSize: '0.9rem'}}>First name</label>
                <input type="text" defaultValue={customer.firstName} style={{width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.2)', background: 'rgba(255, 255, 255, 0.1)', color: 'white'}} />
              </div>
              <div>
                <label style={{display: 'block', marginBottom: '5px', fontSize: '0.9rem'}}>Last name</label>
                <input type="text" defaultValue={customer.lastName} style={{width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.2)', background: 'rgba(255, 255, 255, 0.1)', color: 'white'}} />
              </div>
            </div>
            <div style={{marginBottom: '15px'}}>
              <label style={{display: 'block', marginBottom: '5px', fontSize: '0.9rem'}}>Address</label>
              <input type="text" placeholder="Address" style={{width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.2)', background: 'rgba(255, 255, 255, 0.1)', color: 'white'}} />
            </div>
            <div style={{marginBottom: '15px'}}>
              <label style={{display: 'block', marginBottom: '5px', fontSize: '0.9rem'}}>Apartment, suite, etc (optional)</label>
              <input type="text" placeholder="Apartment, suite, etc (optional)" style={{width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.2)', background: 'rgba(255, 255, 255, 0.1)', color: 'white'}} />
            </div>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px', marginBottom: '20px'}}>
              <div>
                <label style={{display: 'block', marginBottom: '5px', fontSize: '0.9rem'}}>City</label>
                <input type="text" placeholder="City" style={{width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.2)', background: 'rgba(255, 255, 255, 0.1)', color: 'white'}} />
              </div>
              <div>
                <label style={{display: 'block', marginBottom: '5px', fontSize: '0.9rem'}}>State</label>
                <select style={{width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.2)', background: 'rgba(255, 255, 255, 0.1)', color: 'white'}}>
                  <option>Alabama</option>
                </select>
              </div>
              <div>
                <label style={{display: 'block', marginBottom: '5px', fontSize: '0.9rem'}}>ZIP code</label>
                <input type="text" placeholder="ZIP code" style={{width: '100%', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255, 255, 255, 0.2)', background: 'rgba(255, 255, 255, 0.1)', color: 'white'}} />
              </div>
            </div>
            <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
              <button style={{padding: '10px 20px', background: 'none', border: 'none', color: '#FF4444', cursor: 'pointer', fontSize: '1rem'}}>Delete</button>
              <div style={{display: 'flex', gap: '10px'}}>
                <button onClick={closeEditAddress} style={{padding: '10px 20px', background: 'none', border: 'none', color: '#4A9EFF', cursor: 'pointer', fontSize: '1rem'}}>Cancel</button>
                <button style={{padding: '10px 20px', background: '#4A9EFF', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer', fontSize: '1rem'}}>Save</button>
              </div>
            </div>
          </div>
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
