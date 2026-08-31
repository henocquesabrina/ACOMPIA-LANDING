/* ============================================
   ACOMPIA — Mesure d'audience (PostHog)
   Snippet officiel PostHog, extrait des 23 pages qui le dupliquaient.
   Chargé sans `defer` : posthog doit exister avant les scripts applicatifs.
   ============================================ */
!function(t,e){var o,n,p,r;e.__SV||(window.posthog && window.posthog.__loaded)||(window.posthog=e,e._i=[],e.init=function(i,s,a){function g(t,e){var o=e.split(".");2==o.length&&(t=t[o[0]],e=o[1]),t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}}(p=t.createElement("script")).type="text/javascript",p.crossOrigin="anonymous",p.async=!0,p.src=s.api_host.replace(".i.posthog.com","-assets.i.posthog.com")+"/static/array.js",(r=t.getElementsByTagName("script")[0]).parentNode.insertBefore(p,r);var u=e;for(void 0!==a?u=e[a]=[]:a="posthog",u.people=u.people||[],u.toString=function(t){var e="posthog";return"posthog"!==a&&(e+="."+a),t||(e+=" (stub)"),e},u.people.toString=function(){return u.toString(1)+".people (stub)"},o="Ni qi init Xi rn Rr tn sn Ki capture calculateEventProperties dn register register_once register_for_session unregister unregister_for_session fn getFeatureFlag getFeatureFlagPayload getFeatureFlagResult getAllFeatureFlags isFeatureEnabled reloadFeatureFlags updateFlags updateEarlyAccessFeatureEnrollment getEarlyAccessFeatures on onFeatureFlags onSurveysLoaded onSessionId getSurveys getActiveMatchingSurveys renderSurvey displaySurvey cancelPendingSurvey canRenderSurvey canRenderSurveyAsync pn identify setPersonProperties unsetPersonProperties group resetGroups setPersonPropertiesForFlags resetPersonPropertiesForFlags setGroupPropertiesForFlags resetGroupPropertiesForFlags reset shutdown setIdentity clearIdentity get_distinct_id getGroups get_session_id get_session_replay_url alias set_config startSessionRecording stopSessionRecording sessionRecordingStarted captureException addExceptionStep captureLog startExceptionAutocapture stopExceptionAutocapture loadToolbar get_property getSessionProperty cn un createPersonProfile setInternalOrTestUser vn Qi yn opt_in_capturing opt_out_capturing has_opted_in_capturing has_opted_out_capturing get_explicit_consent_status is_capturing clear_opt_in_out_capturing an debug Or Rt getPageViewId captureTraceFeedback captureTraceMetric Wi".split(" "),n=0;n<o.length;n++)g(u,o[n]);e._i.push([i,s,a])},e.__SV=1)}(document,window.posthog||[]);
    posthog.init('phc_tzcr2EPAnKEJNFC3w9rsfwkjJB7zQFJ8NuDziAGZJ8qq', {
      api_host: 'https://eu.i.posthog.com',
      defaults: '2026-05-30',
      /* Le site a tourné sans aucun stockage terminal jusqu'au 31/08/2026
         (`persistence: 'memory'`). Greg a demandé l'enregistrement de session,
         qui a besoin d'un identifiant survivant au changement de page : sans
         lui, chaque page produirait un replay d'un seul écran, inutile pour
         comprendre un abandon de formulaire. D'où le retour au stockage.

         Conséquence directe : la politique de confidentialité ne peut plus
         annoncer l'exemption de consentement prévue par la CNIL pour la seule
         mesure d'audience anonyme. Elle a été réécrite en conséquence. */
      persistence: 'localStorage+cookie',
      person_profiles: 'identified_only',
      respect_dnt: true,
      capture_pageview: true,
      capture_pageleave: true,
      autocapture: true,
      disable_session_recording: false,
      session_recording: {
        /* Les formulaires du site portent SIREN, effectifs, masse salariale et
           adresse électronique d'entreprises qui se renseignent sur leur propre
           exposition URSSAF. Rien de tout cela n'a à partir chez un tiers pour
           qu'on comprenne un parcours : on masque la saisie, pas la navigation.
           `maskAllInputs` couvre les champs, `maskTextSelector` les zones où le
           rapport de prédiagnostic réaffiche ce qui a été saisi. */
        maskAllInputs: true,
        maskTextSelector: '[data-sensible], .acompia-report, .prediag-entry',
        /* Le réseau porterait les mêmes données que les champs masqués. */
        recordCrossOriginIframes: false
      }
    });
