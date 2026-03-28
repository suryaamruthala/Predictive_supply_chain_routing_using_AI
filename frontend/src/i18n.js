import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      "dashboard_title": "Predictive Supply Chain Routing",
      "live_tracking": "Live Tracking",
      "risk_analysis": "Risk Analysis",
      "alerts": "Alerts",
      "safe": "Safe",
      "medium_risk": "Medium Risk",
      "high_risk": "High Risk",
      "rerouted": "Rerouted",
      "transit": "In Transit",
      "delivered": "Delivered",
      "origin": "Origin",
      "destination": "Destination",
      "eta": "ETA",
      "carbon": "Carbon Emissions",
      "risk_score": "Risk Score",
      "route": "Route"
    }
  },
  hi: {
    translation: {
      "dashboard_title": "भविष्य कहनेवाला आपूर्ति श्रृंखला रूटिंग",
      "live_tracking": "लाइव ट्रैकिंग",
      "risk_analysis": "जोखिम विश्लेषण",
      "alerts": "अलर्ट",
      "safe": "सुरक्षित",
      "medium_risk": "मध्यम जोखिम",
      "high_risk": "उच्च जोखिम",
      "rerouted": "मार्ग बदला गया",
      "transit": "पारगमन में",
      "delivered": "वितरित",
      "origin": "मूल",
      "destination": "गंतव्य",
      "eta": "ईटीए",
      "carbon": "कार्बन उत्सर्जन",
      "risk_score": "जोखिम स्कोर",
      "route": "मार्ग"
    }
  },
  te: {
    translation: {
      "dashboard_title": "ప్రిడిక్టివ్ సప్లై చైన్ రూటింగ్",
      "live_tracking": "లైవ్ ట్రాకింగ్",
      "risk_analysis": "ప్రమాద విశ్లేషణ",
      "alerts": "హెచ్చరికలు",
      "safe": "సురక్షితం",
      "medium_risk": "మధ్యస్థ ప్రమాదం",
      "high_risk": "అధిక ప్రమాదం",
      "rerouted": "మార్గం మార్చబడింది",
      "transit": "స్థానభ్రంశం లో ఉంది",
      "delivered": "బట్వాడా చేయబడింది",
      "origin": "మూలం",
      "destination": "గమ్యం",
      "eta": "రాక సమయం",
      "carbon": "కార్బన్ ఉద్గారాలు",
      "risk_score": "ప్రమాద స్కోర్",
      "route": "మార్గం"
    }
  }
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: 'en',
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // react already safes from xss
    }
  });

export default i18n;
