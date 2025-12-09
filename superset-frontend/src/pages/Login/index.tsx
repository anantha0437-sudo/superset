/**
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { SupersetClient, t } from '@superset-ui/core';
import { styled, css } from '@apache-superset/core/ui';
import {
  Button,
  Card,
  Flex,
  Form,
  Input,
  Typography,
  Icons,
  Loading
} from '@superset-ui/core/components';
import { useState, useEffect, useMemo } from 'react';
import { capitalize } from 'lodash/fp';
import { addDangerToast } from 'src/components/MessageToasts/actions';
import { useDispatch } from 'react-redux';
import getBootstrapData from 'src/utils/getBootstrapData';
type OAuthProvider = {
  name: string;
  icon: string;
};

type OIDProvider = {
  name: string;
  url: string;
};

type Provider = OAuthProvider | OIDProvider;

interface LoginForm {
  username: string;
  password: string;
}

enum AuthType {
  AuthOID = 0,
  AuthDB = 1,
  AuthLDAP = 2,
  AuthOauth = 4,
}

const StyledCard = styled(Card)`
  ${({ theme }) => css`
    max-width: 400px;
    width: 100%;
    margin-top: ${theme.marginXL}px;
    color: ${theme.colorBgContainer};
    background: ${theme.colorBgBase};
    .ant-form-item-label label {
      color: ${theme.colorPrimary};
    }
  `}
`;

const StyledLabel = styled(Typography.Text)`
  ${({ theme }) => css`
    font-size: ${theme.fontSizeSM}px;
  `}
`;

export default function Login() {
  const [form] = Form.useForm<LoginForm>();
  const [loading, setLoading] = useState(false);
  const [tcAuthLoading, setTcAuthLoading] = useState(false); //  TC Loader

  const dispatch = useDispatch();

  const bootstrapData = getBootstrapData();
  const nextUrl = useMemo(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('next') || '';
    } catch (_error) {
      return '';
    }
  }, []);

  const loginEndpoint = useMemo(
    () => (nextUrl ? `/login/?next=${encodeURIComponent(nextUrl)}` : '/login/'),
    [nextUrl],
  );

  const buildProviderLoginUrl = (providerName: string) => {
    const base = `/login/${providerName}`;
    return nextUrl
      ? `${base}${base.includes('?') ? '&' : '?'}next=${encodeURIComponent(nextUrl)}`
      : base;
  };

  const authType: AuthType = bootstrapData.common.conf.AUTH_TYPE;
  const providers: Provider[] = bootstrapData.common.conf.AUTH_PROVIDERS;
  const authRegistration: boolean =
    bootstrapData.common.conf.AUTH_USER_REGISTRATION;

  // TODO: This is a temporary solution for showing login errors after form submission.
  // Should be replaced with proper SPA-style authentication (JSON API with error responses)
  // when Flask-AppBuilder is updated or we implement a custom login endpoint.
  useEffect(() => {
    const loginAttempted = sessionStorage.getItem('login_attempted');

    if (loginAttempted === 'true') {
      sessionStorage.removeItem('login_attempted');
      dispatch(addDangerToast(t('Invalid username or password')));
      // Clear password field for security
      form.setFieldsValue({ password: '' });
    }
  }, [dispatch, form]);

  const onFinish = (values: LoginForm) => {
    setLoading(true);

    // Mark that we're attempting login (for error detection after redirect)
    sessionStorage.setItem('login_attempted', 'true');

    // Use standard form submission for Flask-AppBuilder compatibility
    SupersetClient.postForm(loginEndpoint, values, '');
  };
  
  
  
  // AUTO AUTH — TimeChamp Login
  useEffect(() => {
    if (true) {
      setTcAuthLoading(true);

      const loggedInUser=JSON.parse(localStorage.getItem("userModel") || "{}");
      const userAuthToken=localStorage.getItem("CurrentUser");

      
    const payload = {
    token: userAuthToken || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJuYW1laWQiOiJmOTdlNjUwYy0zYTFkLTRmNWQtOWRhNi0yMjAzNjMzODk2OTIiLCJDb21wYW55IjoiNTk2NjIyNWUtYmY0Ni00YjZlLTlmNzQtZDQwODY1ZDBkMTc0IiwibmJmIjoxNzY0MjI3ODEwLCJleHAiOjIxOTYyMjc4MTAsImlhdCI6MTc2NDIyNzgxMH0.j0Vx0h0n0fNuxPqQGzDoJUT4x9lEbtZ4NrWhhpBFEFg",
    firstName: loggedInUser?.firstName || "John",
    lastName: loggedInUser?.surName || "Doe",        
    userName: loggedInUser?.userName || "hkerklhfdsgf",
    userEmail: loggedInUser?.userEmail || "john.doefffgg@example.com",
    tcUserId: loggedInUser?.userId || "F97E650C-3A1D-4F5D-9DA6-220363389692",         
    tcCompanyId: loggedInUser?.companyId || "5966225E-BF46-4B6E-9F74-D40865D0D174",  
    role: loggedInUser?.roleName || "Super Admin",       
    origin: window.location.origin,                   
  };



      SupersetClient.post({
        endpoint: "/api/v1/security/local-login/",
        jsonPayload: payload,
      })
        .then((response) => {
          if (response?.json?.success == true) {
          window.location.href = nextUrl || "/dataanalytics/superset/welcome/";
          return;
   
      }
        window.location.href= "/signin";
        return;
  
        })
        .catch((error) => {
          setTcAuthLoading(false);
          window.location.href = "/signin";
          dispatch(addDangerToast(t("Unable to access data analytics. Please contact support.")));
          console.error("TC Login Error:", error);
        });
    }
  }, [authType, nextUrl, dispatch]);

  const getAuthIconElement = (
    providerName: string,
  ): React.JSX.Element | undefined => {
    if (!providerName || typeof providerName !== 'string') {
      return undefined;
    }
    const iconComponentName = `${capitalize(providerName)}Outlined`;
    const IconComponent = (Icons as Record<string, React.ComponentType<any>>)[
      iconComponentName
    ];

    if (IconComponent && typeof IconComponent === 'function') {
      return <IconComponent />;
    }
    return undefined;
  };

  // return (
  //   <Flex
  //     justify="center"
  //     align="center"
  //     data-test="login-form"
  //     css={css`
  //       width: 100%;
  //       height: calc(100vh - 200px);
  //     `}
  //   >
  //     <StyledCard title={t('Sign in')} padded>
  //       {authType === AuthType.AuthOID && (
  //         <Flex justify="center" vertical gap="middle">
  //           <Form layout="vertical" requiredMark="optional" form={form}>
  //             {providers.map((provider: OIDProvider) => (
  //               <Form.Item<LoginForm>>
  //                 <Button
  //                   href={buildProviderLoginUrl(provider.name)}
  //                   block
  //                   iconPosition="start"
  //                   icon={getAuthIconElement(provider.name)}
  //                 >
  //                   {t('Sign in with')} {capitalize(provider.name)}
  //                 </Button>
  //               </Form.Item>
  //             ))}
  //           </Form>
  //         </Flex>
  //       )}
  //       {authType === AuthType.AuthOauth && (
  //         <Flex justify="center" gap={0} vertical>
  //           <Form layout="vertical" requiredMark="optional" form={form}>
  //             {providers.map((provider: OAuthProvider) => (
  //               <Form.Item<LoginForm>>
  //                 <Button
  //                   href={buildProviderLoginUrl(provider.name)}
  //                   block
  //                   iconPosition="start"
  //                   icon={getAuthIconElement(provider.name)}
  //                 >
  //                   {t('Sign in with')} {capitalize(provider.name)}
  //                 </Button>
  //               </Form.Item>
  //             ))}
  //           </Form>
  //         </Flex>
  //       )}

  //       {(authType === AuthType.AuthDB || authType === AuthType.AuthLDAP) && (
  //         <Flex justify="center" vertical gap="middle">
  //           <Typography.Text type="secondary">
  //             {t('Enter your login and password below:')}
  //           </Typography.Text>
  //           <Form
  //             layout="vertical"
  //             requiredMark="optional"
  //             form={form}
  //             onFinish={onFinish}
  //           >
  //             <Form.Item<LoginForm>
  //               label={<StyledLabel>{t('Username:')}</StyledLabel>}
  //               name="username"
  //               rules={[
  //                 { required: true, message: t('Please enter your username') },
  //               ]}
  //             >
  //               <Input
  //                 autoFocus
  //                 prefix={<Icons.UserOutlined iconSize="l" />}
  //                 data-test="username-input"
  //               />
  //             </Form.Item>
  //             <Form.Item<LoginForm>
  //               label={<StyledLabel>{t('Password:')}</StyledLabel>}
  //               name="password"
  //               rules={[
  //                 { required: true, message: t('Please enter your password') },
  //               ]}
  //             >
  //               <Input.Password
  //                 prefix={<Icons.KeyOutlined iconSize="l" />}
  //                 data-test="password-input"
  //               />
  //             </Form.Item>
  //             <Form.Item label={null}>
  //               <Flex
  //                 css={css`
  //                   width: 100%;
  //                 `}
  //               >
  //                 <Button
  //                   block
  //                   type="primary"
  //                   htmlType="submit"
  //                   loading={loading}
  //                   data-test="login-button"
  //                 >
  //                   {t('Sign in')}
  //                 </Button>
  //                 {authRegistration && (
  //                   <Button
  //                     block
  //                     type="default"
  //                     href="/register/"
  //                     data-test="register-button"
  //                   >
  //                     {t('Register')}
  //                   </Button>
  //                 )}
  //               </Flex>
  //             </Form.Item>
  //           </Form>
  //         </Flex>
  //       )}
  //     </StyledCard>
  //   </Flex>
  // );

   return (
    <Flex
      justify="center"
      align="center"
      data-test="login-form"
      css={css`
        width: 100%;
        height: calc(100vh - 200px);
      `}
    >
      <Loading position="inline-centered" size="l" />
    </Flex>
  );
}
