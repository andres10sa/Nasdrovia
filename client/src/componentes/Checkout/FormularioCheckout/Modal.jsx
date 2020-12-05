import React from 'react';
import './Modal.css';
import {Link} from 'react-router-dom'



const Modal = ({setTerminada}) => {

    const handleClick = ()=>{
        localStorage.removeItem('carrito');
        localStorage.removeItem('total')
        setTerminada(false)
    }

    return ( 
        <div className='contenedor-modal'>
            <div className="mensaje-modal">
                <h3>Su compra ha sido exitosa</h3>
               <Link to='/'><button className='btn-modal-check' onClick={handleClick}>Confimar</button></Link> 
            </div>
        </div>
     );
}
 
export default Modal