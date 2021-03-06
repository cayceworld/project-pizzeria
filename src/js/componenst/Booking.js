import { templates, select, settings, classNames } from './../settings.js';
import utils from '../utils.js';
import AmountWidget from './AmountWidget.js';
import HourPicker from './HourPicker.js';
import DatePicker from './DatePicker.js';

class Booking {
  constructor(element) {
    const thisBooking = this;

    thisBooking.render(element);
    thisBooking.initWidgets();
    thisBooking.getData();

    thisBooking.selectedTable = [];
    //console.log(thisBooking.selectedTable);
  }
  getData() {
    const thisBooking = this;

    const startDateParam = settings.db.dateStartParamKey + '=' + utils.dateToStr(thisBooking.datePicker.minDate);
    const endDateParam = settings.db.dateEndParamKey + '=' + utils.dateToStr(thisBooking.datePicker.maxDate);

    const params = {

      bookings: [
        startDateParam,
        endDateParam,
      ],
      eventsCurrent: [
        settings.db.notRepeatParam,
        startDateParam,
        endDateParam,
      ],
      eventsRepeat: [
        settings.db.repeatParam,
        endDateParam,
      ],
    };
    //console.log('getData params', params);
    const urls = {
      booking: settings.db.url + '/' + settings.db.bookings
        + '?' + params.bookings.join('&'),
      eventsCurrent: settings.db.url + '/' + settings.db.events
        + '?' + params.eventsCurrent.join('&'),
      eventsRepeat: settings.db.url + '/' + settings.db.events
        + '?' + params.eventsRepeat.join('&'),
    };
    //console.log('getData urls', urls);

    Promise.all([
      fetch(urls.booking),
      fetch(urls.eventsCurrent),
      fetch(urls.eventsRepeat),
    ])
      .then(function (allResponses) {
        const bookingsResponse = allResponses[0];
        const eventsCurrentResponse = allResponses[1];
        const eventsRepeatResponse = allResponses[2];
        //console.log(bookingsResponse);
        //console.log(eventsCurrentResponse);
        //console.log(eventsRepeatResponse);
        return Promise.all([
          bookingsResponse.json(),
          eventsCurrentResponse.json(),
          eventsRepeatResponse.json(),
        ]);

      })
      .then(function ([bookings, eventsCurrent, eventsRepeat]) {
        //console.log('bookings',bookings);
        //console.log('eventsCurrent',eventsCurrent);
        //console.log('eventsRepeat',eventsRepeat);
        thisBooking.parseData(bookings, eventsCurrent, eventsRepeat);
      });
  }
  parseData(bookings, eventsCurrent, eventsRepeat) {
    const thisBooking = this;
    //console.log(eventsRepeat);
    thisBooking.booked = {};
    for (let item of bookings) {
      thisBooking.makeBooked(item.date, item.hour, item.duration, item.table);
    }
    for (let item of eventsCurrent) {
      thisBooking.makeBooked(item.date, item.hour, item.duration, item.table);
    }
    const minDate = thisBooking.datePicker.minDate;
    const maxDate = thisBooking.datePicker.maxDate;

    for (let item of eventsRepeat) {
      if (item.repeat == 'daily') {
        for (let loopDate = minDate; loopDate <= maxDate; loopDate = utils.addDays(loopDate, 1)) {
          thisBooking.makeBooked(utils.dateToStr(loopDate), item.hour, item.duration, item.table);
        }
      }
    }
    thisBooking.updateDOM();
    //console.log('thisBooking.booked:', thisBooking.booked);
  }
  makeBooked(date, hour, duration, table) {
    const thisBooking = this;

    if (typeof thisBooking.booked[date] == 'undefined') {
      thisBooking.booked[date] = {};
    }
    const startHour = utils.hourToNumber(hour);

    for (let hourBlock = startHour; hourBlock < startHour + duration; hourBlock += 0.5) {
      // console.log('loop', hourBlock);


      if (typeof thisBooking.booked[date][hourBlock] == 'undefined') {
        thisBooking.booked[date][hourBlock] = [];
      }

      thisBooking.booked[date][hourBlock].push(table);
      
    }

  }
  updateDOM() {
    const thisBooking = this;


    thisBooking.date = thisBooking.datePicker.value;
    thisBooking.hour = utils.hourToNumber(thisBooking.hourPicker.value);

    let allAvailable = false;
    if (
      typeof thisBooking.booked[thisBooking.date] == 'undefined'
      ||
      typeof thisBooking.booked[thisBooking.date][thisBooking.hour] == 'undefined'
    ) {
      allAvailable = true;
    }
    //console.log(thisBooking.dom.tables);
    for (let table of thisBooking.dom.tables) {
      let tableId = table.getAttribute(settings.booking.tableIdAttribute);
      if (!isNaN(tableId)) {
        tableId = parseInt(tableId);
      }

      if (
        !allAvailable
        &&
        thisBooking.booked[thisBooking.date][thisBooking.hour].includes(tableId) > -1
      ) {
        table.classList.add(classNames.booking.tableBooked);
      } else {
        table.classList.remove(classNames.booking.tableBooked);
      }
    }
  }
  initTables(clickedElement) {
    const thisBooking = this;


    const dataTable = clickedElement.getAttribute('data-table');
    const activeTable = document.querySelector('.selected');
    if (clickedElement.classList.contains('table')) {
      if (!clickedElement.classList.contains(classNames.booking.tableBooked)) {

        // console.log(activeTable);
        if (activeTable !== clickedElement) {
          removeSelectedTable();

        }
        clickedElement.classList.toggle('selected');
        thisBooking.selectedTable.push(dataTable);
        console.log(thisBooking.selectedTable);
      } else {
        alert('table is not available');
      }
    }
    function removeSelectedTable() {
      for (let table of thisBooking.dom.tables) {
        //console.log('removeSelectedTable');
        table.classList.remove(classNames.booking.tableSelect);
        thisBooking.selectedTable.pop(dataTable);
      }
    }
    thisBooking.dom.wrapper.addEventListener('updated', function () {
      removeSelectedTable();
    });


  }
  render(element) {
    const thisBooking = this;

    const generateHTML = templates.bookingWidget();


    thisBooking.dom = {};
    thisBooking.dom.wrapper = element;
    thisBooking.dom.wrapper.innerHTML = generateHTML;

    //console.log(generateHTML);

    thisBooking.dom.peopleAmount = element.querySelector(select.booking.peopleAmount);
    thisBooking.dom.hoursAmount = element.querySelector(select.booking.hoursAmount);

    thisBooking.dom.hourPicker = element.querySelector(select.widgets.hourPicker.wrapper);
    thisBooking.dom.datePicker = element.querySelector(select.widgets.datePicker.wrapper);

    //console.log(thisBooking.dom.datePicker);
    thisBooking.dom.tables = document.querySelectorAll(select.booking.tables);
    thisBooking.dom.table = document.querySelectorAll(select.booking.table);
    thisBooking.dom.floorPlan = document.querySelector(select.booking.floorPlan);
    thisBooking.dom.submit = document.querySelector(select.booking.submit);
    thisBooking.dom.phone = document.querySelector(select.booking.phone);
    thisBooking.dom.address = document.querySelector(select.booking.address);
    thisBooking.dom.starters = document.querySelectorAll(select.booking.starters);
    //console.log(thisBooking.dom.starters);
  }
  initWidgets() {
    const thisBooking = this;

    thisBooking.peopleAmount = new AmountWidget(thisBooking.dom.peopleAmount);
    thisBooking.hoursAmount = new AmountWidget(thisBooking.dom.hoursAmount);

    thisBooking.hourPicker = new HourPicker(thisBooking.dom.hourPicker);
    thisBooking.datePicker = new DatePicker(thisBooking.dom.datePicker);

    thisBooking.dom.wrapper.addEventListener('updated', function () {
      thisBooking.updateDOM();
    });

    //console.log(thisBooking.dom.wrapper);

    thisBooking.dom.floorPlan.addEventListener('click', function (event) {
      event.preventDefault();
      const clickedElement = event.target;
      //console.log(clickedElement);

      thisBooking.initTables(clickedElement);
    });

    thisBooking.dom.wrapper.addEventListener('submit', function (event) {
      event.preventDefault();
      thisBooking.sendBooking();
    });

  }
  sendBooking() {
    const thisBooking = this;

    const url = settings.db.url + '/' + settings.db.bookings;
    console.log(url);
    const payload = {
      date: thisBooking.date,
      hour: thisBooking.hourPicker.value,
      table: thisBooking.selectedTable,
      duration: thisBooking.peopleAmount.correctValue,
      ppl: thisBooking.hoursAmount.correctValue,
      starters: [],
      phone: thisBooking.dom.phone.value,
      address: thisBooking.dom.address.value,
    };
    for (let starter of thisBooking.dom.starters) {
      if (starter.checked) {
        payload.starters.push(starter.value);
      }
    }
    console.log(payload);
    console.log(url);
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    };

    fetch(url, options).then(function(){
      window.location.reload(true);
    });
    console.log(payload);
    
  }
}







export default Booking;