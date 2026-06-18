import { ActivityIndicator, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { colors } from '@aural/shared';
import { useAuth } from '../features/auth/AuthContext';

import { WelcomeScreen } from '../features/auth/screens/WelcomeScreen';
import { LoginScreen } from '../features/auth/screens/LoginScreen';
import { RoleSelectScreen } from '../features/auth/screens/RoleSelectScreen';
import { SubSpecialtySelectScreen } from '../features/auth/screens/SubSpecialtySelectScreen';
import { RegisterScreen } from '../features/auth/screens/RegisterScreen';
import { PendingScreen } from '../features/auth/screens/PendingScreen';
import { ForgotPasswordScreen } from '../features/auth/screens/ForgotPasswordScreen';
import { WaitingScreen } from '../features/auth/screens/WaitingScreen';

import { HomeScreen } from '../features/home/HomeScreen';
import { PatientsListScreen } from '../features/patients/PatientsListScreen';
import { PatientDetailScreen } from '../features/patients/PatientDetailScreen';
import { PatientTimelineScreen } from '../features/patients/PatientTimelineScreen';
import { ReportsScreen } from '../features/reports/ReportsScreen';
import { ReportDetailScreen } from '../features/reports/ReportDetailScreen';
import { PaymentsScreen } from '../features/payments/PaymentsScreen';
import { NewsScreen } from '../features/news/NewsScreen';
import { NewsDetailScreen } from '../features/news/NewsDetailScreen';
import { NewLeadScreen } from '../features/leads/NewLeadScreen';
import { VisitorHomeScreen } from '../features/visitor/VisitorHomeScreen';
import { VisitorDoctorsScreen } from '../features/visitor/VisitorDoctorsScreen';

import type { AuthStackParamList, MainStackParamList, VisitorStackParamList } from './types';

const AuthStack = createNativeStackNavigator<AuthStackParamList>();
const MainStack = createNativeStackNavigator<MainStackParamList>();
const VisitorStack = createNativeStackNavigator<VisitorStackParamList>();

const screenOptions = {
  headerShadowVisible: false,
  headerTintColor: colors.primary,
  headerStyle: { backgroundColor: colors.background },
  headerTitle: '',
  contentStyle: { backgroundColor: colors.background },
} as const;

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={screenOptions}>
      <AuthStack.Screen name="Welcome" component={WelcomeScreen} options={{ headerShown: false }} />
      <AuthStack.Screen name="Login" component={LoginScreen} />
      <AuthStack.Screen name="RoleSelect" component={RoleSelectScreen} />
      <AuthStack.Screen name="SubSpecialtySelect" component={SubSpecialtySelectScreen} />
      <AuthStack.Screen name="Register" component={RegisterScreen} />
      <AuthStack.Screen name="Pending" component={PendingScreen} options={{ headerShown: false }} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    </AuthStack.Navigator>
  );
}

function MainNavigator() {
  return (
    <MainStack.Navigator screenOptions={screenOptions}>
      <MainStack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
      <MainStack.Screen name="Patients" component={PatientsListScreen} options={{ headerTitle: 'Mis pacientes' }} />
      <MainStack.Screen name="PatientTimeline" component={PatientTimelineScreen} options={{ headerTitle: 'Trazabilidad' }} />
      <MainStack.Screen name="PatientDetail" component={PatientDetailScreen} options={{ headerTitle: 'Ficha completa' }} />
      <MainStack.Screen name="Reports" component={ReportsScreen} options={{ headerTitle: 'Informes médicos' }} />
      <MainStack.Screen name="ReportDetail" component={ReportDetailScreen} options={{ headerTitle: 'Informe' }} />
      <MainStack.Screen name="Payments" component={PaymentsScreen} options={{ headerTitle: 'Mis pagos' }} />
      <MainStack.Screen name="News" component={NewsScreen} options={{ headerTitle: 'Noticias' }} />
      <MainStack.Screen name="NewsDetail" component={NewsDetailScreen} options={{ headerTitle: '' }} />
      <MainStack.Screen name="NewLead" component={NewLeadScreen} options={{ presentation: 'modal', headerTitle: 'Oportunidad' }} />
    </MainStack.Navigator>
  );
}

function VisitorNavigator() {
  return (
    <VisitorStack.Navigator screenOptions={screenOptions}>
      <VisitorStack.Screen name="VisitorHome" component={VisitorHomeScreen} options={{ headerShown: false }} />
      <VisitorStack.Screen name="VisitorDoctors" component={VisitorDoctorsScreen} options={{ headerTitle: 'Mis médicos' }} />
    </VisitorStack.Navigator>
  );
}

export function RootNavigator() {
  const { loading, session, profile } = useAuth();
  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background }}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }
  const isApproved = profile?.status === 'approved';
  const isVisitorRep = profile?.admin_role === 'visitor_rep';

  return (
    <NavigationContainer>
      {!session ? (
        <AuthNavigator />
      ) : !isApproved ? (
        <WaitingScreen />
      ) : isVisitorRep ? (
        <VisitorNavigator />
      ) : (
        <MainNavigator />
      )}
    </NavigationContainer>
  );
}
