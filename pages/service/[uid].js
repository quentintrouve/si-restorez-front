import React, { useContext, useEffect, useState } from "react";
import { useRouter } from "next/router";
import { loadStripe } from "@stripe/stripe-js";
const stripePromise = loadStripe(
  "pk_test_51IiewUHv3LwBSOHcbDnAslOArSH2dGjSoSa2oVhfsPSo8tODPIWYvUhf2AhkYba3Py4nIgudzUCbRMYxriEsegCo00FQtPH9Kh"
);

import toast, { Toaster } from "react-hot-toast";
import axios from "axios";
import { userContext } from "../../context/userContext";
import Button from "@material-ui/core/Button";
import Form from "../../Components/Form";

import classnames from "classnames/bind";
import css from "./styles.module.scss";
import ReservationsList from "../../Components/ReservationsList";
const cx = classnames.bind(css);

export default function ReservationsPage() {
  const { user } = useContext(userContext);
  const router = useRouter();
  const serviceId = router?.query?.uid;

  const [formState, setFormState] = useState(null);
  const [reservationId, setReservationId] = useState(null);
  const [restaurantName, setRestaurantName] = useState(null);

  const [display, setDisplay] = useState("list");
  const [reservationsList, setReservationsList] = useState(null);
  const [serviceInfos, setServiceInfos] = useState(null);
  useEffect(() => {
    if (serviceId) {
      getReservations(serviceId);
      getServiceInfos(serviceId);
    }
  }, [serviceId]);

  useEffect(() => {
    if (serviceInfos) {
      getRestaurantName(serviceInfos?.id_restaurant);
    }
  }, [serviceInfos]);

  const getRestaurantName = (id) => {
    axios.get(`http://localhost:5000/restaurants/${id}`).then((rep) => {
      setRestaurantName(rep?.data?.data?.name);
    });
  };

  useEffect(() => {
    if (!user) {
      Router.push("/login");
    }
  }, [user]);

  const getServiceInfos = async (id) => {
    axios
      .get(`http://localhost:5000/services/${id}`)
      .then((rep) => setServiceInfos(rep?.data?.data))
      .catch((rep) => console.log(rep?.response));
  };

  const getReservations = async (id) => {
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${user?.accessToken}`,
    };
    axios
      .get(`http://localhost:5000/reservations/id-service/${id}`, {
        headers: headers,
      })
      .then((rep) => setReservationsList(rep?.data?.data))
      .catch((rep) => console.log(rep?.response));
  };

  const formatDate = (arg) => {
    const date = new Date(arg);
    const day = date?.getDay();
    const month = date?.getMonth();
    const year = date?.getFullYear();
    return `${day}/${month}/${year}`;
  };

  const handleSubmit = (values) => {
    const data = { ...values, id_service: serviceId };
    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${user?.accessToken}`,
    };

    axios
      .post(`http://localhost:5000/reservations`, data, {
        headers: headers,
      })
      .then((rep) => {
        console.log(rep);
        if (rep?.data?.status === 200) {
          getReservations(serviceId);
          getServiceInfos(serviceId);
          setFormState("submited");
          setReservationId(rep?.data?.data?.[0]?.id_reservation);
          toast.success("Réservation bien enregistré");
        }
      })
      .catch((err) => {
        const message = err?.response?.data?.errors?.[0];
        message?.forEach((error) => {
          toast?.error(error?.param + " : " + error?.msg);
        });
      });
  };

  const handlePayment = async (values) => {
    const stripe = await stripePromise;

    const response = await fetch(
      "http://localhost:5000/reservations/checkout",
      {
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        method: "POST",
        body: JSON.stringify({
          ...values,
          currency: "eur",
          name: restaurantName,
          reservation_id: reservationId,
          success_url: `http://localhost:5000/service/${serviceId}`,
          cancel_url: `http://localhost:5000/service/${serviceId}`,
        }),
      }
    );

    const session = await response.json();

    const result = await stripe.redirectToCheckout({
      sessionId: session.id,
    });
    if (result.error) {
      toast.error("Network error");
    }
  };

  return (
    user &&
    Object.keys(user).length !== 0 && (
      <main>
        <Toaster position="bottom-center" />
        <div className={css.serviceInfos}>
          <div className={css.header}>
            <h1 className={css.title}>
              {display === "list"
                ? "Vos réservations"
                : "Ajouter une réservation"}
            </h1>
            <h3>{restaurantName}</h3>
            {display === "list" ? (
              <Button
                variant="contained"
                color="primary"
                onClick={() => setDisplay("form")}
              >
                Ajouter une reservation
              </Button>
            ) : (
              <Button
                variant="contained"
                color="primary"
                onClick={() => {
                  setDisplay("list");
                  setFormState(null);
                  setReservationId(null);
                }}
              >
                retour à la liste
              </Button>
            )}
          </div>
          <div>
            <p>
              Service du {formatDate(serviceInfos?.date)} de{" "}
              {serviceInfos?.start_hour?.substr(0, 5)} à{" "}
              {serviceInfos?.end_hour?.substr(0, 5)}
            </p>
            <p>
              Nombre de couverts réservés :{" "}
              {serviceInfos?.reservations_quantity}
            </p>
            <p>
              Nombre de couverts ouverts à la reservation :{" "}
              {serviceInfos?.capacity}
            </p>
          </div>
        </div>
        {display === "list" &&
          (reservationsList?.length > 0 ? (
            <ReservationsList reservationsList={reservationsList} />
          ) : (
            <p>Aucunes reservations pour ce service</p>
          ))}
        {display === "form" && (
          <>
            <div className={css.formContainer}>
              <div className={css.form}>
                <Form
                  submitText={"Créer"}
                  handleSubmit={handleSubmit}
                  inputs={[
                    {
                      label: "Nombre de personne",
                      name: "customer_quantity",
                      type: "number",
                      id: 1,
                      required: true,
                    },
                    {
                      label: "Email de réservation",
                      name: "customer_email",
                      type: "email",
                      id: 2,
                      required: true,
                    },
                    {
                      label: "Téléphone de réservation",
                      name: "customer_phone",
                      type: "tel",
                      id: 3,
                      required: true,
                    },
                    {
                      label: "Nom",
                      name: "customer_name",
                      type: "text",
                      id: 4,
                      required: true,
                    },
                    {
                      label: "Heure de réservation",
                      name: "hour",
                      type: "time",
                      id: 5,
                      required: true,
                    },
                  ]}
                />
              </div>
              {formState === "submited" && (
                <>
                  <div className={css.form}>
                    <Form
                      submitText={"Prépayer"}
                      title="Invitez des amis! ajoutez un prépaiement"
                      handleSubmit={handlePayment}
                      inputs={[
                        {
                          label: "Montant (en euros)",
                          name: "amount",
                          type: "number",
                          id: 1,
                          required: true,
                        },
                      ]}
                    />
                  </div>
                  <Button
                    variant="contained"
                    color="secondary"
                    onClick={() => {
                      setDisplay("list");
                      setFormState(null);
                      setReservationId(null);
                    }}
                  >
                    non merci
                  </Button>
                </>
              )}
            </div>
          </>
        )}
      </main>
    )
  );
}
