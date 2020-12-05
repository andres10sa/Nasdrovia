import React, {useState}  from 'react';
import './Checkout.css';
import Formulario from './FormularioCheckout/FormularioCheckout';
import Resumen from './Resumen/Resumen';
import Modal from './FormularioCheckout/Modal';

const Checkout = () => {
    const [terminada,setTerminada]=useState(false)
    return (  
        <section className=" general-checkout ">
            <div className="container">
            <div className="row">
                <div className="col-8 seccion-formulario">
                    <h2 className='mb-3 titulo-checkout mt-3'>DIRECCIÓN DE ENTREGA</h2>
                        <Formulario setTerminada={setTerminada}/>
                
                </div>
                <div className="col-4 mt-3">
                <Resumen/> 
                </div>
            </div>
            </div>
        {terminada && <Modal setTerminada={setTerminada}/>}
        </section>
    );
}

export default Checkout;